"use client";

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  RealtimeContext,
  type RealtimeContextValue,
  type RealtimeMessage,
  type ConnectionStatus,
} from "./RealtimeContext";
import { WS_URL, API_URL } from "./config";

const MAX_MESSAGES = 200;
const RECONNECT_MAX_DELAY = 30000;

function jitter(base: number): number {
  return base + Math.random() * 500;
}

/** Find by clientId and update, or append if new. The ONLY way a wish enters state. */
function upsertByClientId(prev: RealtimeMessage[], incoming: RealtimeMessage): RealtimeMessage[] {
  if (incoming.clientId) {
    const idx = prev.findIndex((m) => m.clientId === incoming.clientId);
    if (idx >= 0) {
      const next = [...prev];
      next[idx] = incoming;
      return next;
    }
  }
  return [...prev, incoming];
}

export default function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [viewerCount, setViewerCount] = useState(0);
  const [liveEnabled, setLiveEnabled] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const hasReceivedRef = useRef(false);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSend = useRef<Array<{ type: string; payload?: unknown }>>([]);

  const reconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("offline");
    scheduleReconnect();
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    if (reconnectTimer.current) return;

    const attempt = reconnectAttempt.current;
    const delay = Math.min(1000 * Math.pow(2, attempt), RECONNECT_MAX_DELAY);
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      if (mountedRef.current) {
        connectWs();
      }
    }, jitter(delay));
  }, []);

  const connectWs = useCallback(() => {
    if (!WS_URL || !mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus((prev) => (prev === "idle" || prev === "empty" ? "connecting" : prev === "ready" ? "ready" : "connecting"));

    try {
      const ws = new WebSocket(`${WS_URL}/ws`);

      ws.onopen = () => {
        if (!mountedRef.current) return;
        reconnectAttempt.current = 0;
        setStatus(hasReceivedRef.current ? "ready" : "connecting");

        // Start ping
        if (pingInterval.current) clearInterval(pingInterval.current);
        pingInterval.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 4 * 60 * 1000);

        // Flush any pending sends
        while (pendingSend.current.length > 0) {
          const msg = pendingSend.current.shift()!;
          try {
            ws.send(JSON.stringify(msg));
          } catch {}
        }

        // Always fetch via REST on connect (catches messages missed during disconnection)
        fetch(`${API_URL}/api/messages`)
          .then((r) => (r.ok ? r.json() : []))
          .then((data: unknown) => {
            if (!mountedRef.current) return;
            if (Array.isArray(data) && data.length > 0) {
              // Server returns newest-first; reverse to ascending (oldest first)
              const reversed = [...data].reverse();
              const mapped: RealtimeMessage[] = reversed
                .filter((m: any) => !m.hidden)
                .map((m: any) => ({
                  id: String(m.seq || m.id || m._id),
                  clientId: m.clientId || undefined,
                  name: m.name || "",
                  department: m.department || undefined,
                  message: m.message || "",
                  timestamp: m.createdAt ? new Date(m.createdAt).getTime() : (m.created_at ? new Date(m.created_at).getTime() : Date.now()),
                }));
              setMessages((prev) => {
                // Merge: keep any optimistic messages not yet in REST response, replace the rest
                const restIds = new Set(mapped.map((m) => m.id));
                const optimisticOnly = prev.filter((m) => m.clientId && !restIds.has(m.id));
                return [...mapped, ...optimisticOnly].slice(-MAX_MESSAGES);
              });
              hasReceivedRef.current = true;
              setStatus("ready");
            } else if (Array.isArray(data) && data.length === 0) {
              hasReceivedRef.current = true;
              setStatus("empty");
            }
          })
          .catch(() => {
            // REST unavailable - rely on WS messages
          });

        // Fetch live state via REST
        fetch(`${API_URL}/api/live`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data: any) => {
            if (data && typeof data.enabled === "boolean") {
              setLiveEnabled(data.enabled);
            }
          })
          .catch(() => {});
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "messages" && Array.isArray(msg.messages)) {
            const mapped: RealtimeMessage[] = msg.messages.map((m: any) => ({
              id: String(m.seq || m.id || m._id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
              clientId: m.clientId || undefined,
              name: m.name || "",
              department: m.department || undefined,
              message: m.message || "",
              timestamp: m.createdAt ? new Date(m.createdAt).getTime() : (m.created_at ? new Date(m.created_at).getTime() : Date.now()),
              hidden: m.hidden,
            }));
            if (mapped.length > 0) {
              hasReceivedRef.current = true;
              setStatus("ready");
            }
            setMessages((prev) => {
              let next = prev;
              for (const m of mapped) {
                if (m.hidden) continue;
                next = upsertByClientId(next, m);
              }
              return next.slice(-MAX_MESSAGES);
            });
          } else if (msg.type === "init") {
            // Server assigned lane
            if (msg.live !== undefined) {
              setLiveEnabled(msg.live);
            }
            // Process history from server's memory buffer (catches messages missed during disconnect)
            if (Array.isArray(msg.history) && msg.history.length > 0) {
              const initMapped: RealtimeMessage[] = msg.history.map((m: any) => ({
                id: String(m.seq || m.id || m._id),
                clientId: m.clientId || undefined,
                name: m.name || "",
                department: m.department || undefined,
                message: m.message || "",
                timestamp: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
              }));
              setMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const newMsgs = initMapped.filter((m) => !existingIds.has(m.id));
                if (newMsgs.length === 0) return prev;
                return [...prev, ...newMsgs].slice(-MAX_MESSAGES);
              });
              hasReceivedRef.current = true;
              setStatus("ready");
            }
          } else if (msg.type === "live_state") {
            setLiveEnabled(msg.enabled);
          } else if (msg.type === "pong") {
            // pong from server
          }
        } catch {
          // ignore malformed
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }
        wsRef.current = null;
        setStatus((prev) => (prev === "ready" || prev === "connecting" ? "offline" : "offline"));
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      setStatus("offline");
      scheduleReconnect();
    }
  }, [scheduleReconnect]);

  // Initial mount
  useEffect(() => {
    mountedRef.current = true;

    if (!WS_URL) {
      // No service configured — go straight to empty (no WS, no REST)
      setStatus("empty");
      return;
    }

    connectWs();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pingInterval.current) clearInterval(pingInterval.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connectWs]);

  const send = useCallback(
    (msg: { name: string; department?: string; message: string }) => {
      const clientId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      // Optimistic add: immediately show in the feed
      setMessages((prev) =>
        upsertByClientId(prev, {
          id: clientId,
          clientId,
          name: msg.name,
          department: msg.department || undefined,
          message: msg.message,
          timestamp: Date.now(),
        })
      );

      const payload = {
        name: msg.name,
        department: msg.department || "",
        message: msg.message,
        clientId,
      };

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: "message", payload }));
        } catch {
          pendingSend.current.push({ type: "message", payload });
        }
      } else {
        // Fallback: POST via REST
        fetch(`${API_URL}/api/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => {
          pendingSend.current.push({ type: "message", payload });
        });
      }
    },
    []
  );

  const value = useMemo<RealtimeContextValue>(
    () => ({ messages, status, viewerCount, liveEnabled, send, reconnect }),
    [messages, status, viewerCount, liveEnabled, send, reconnect]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
