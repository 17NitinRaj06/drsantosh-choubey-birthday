"use client";

import { useState, useEffect, useCallback } from "react";
import {
  adminLogin,
  getAdminMessages,
  deleteMessage,
  hideMessage,
  type WishMessage,
} from "@/lib/api";
import { getWebSocket } from "@/lib/websocket";
import { API_URL } from "@/lib/config";

const TOKEN_KEY = "admin_token";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [messages, setMessages] = useState<WishMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveLastChanged, setLiveLastChanged] = useState<string>("");

  // Restore token from sessionStorage on mount
  useEffect(() => {
    const stored = getStoredToken();
    if (stored) setToken(stored);
  }, []);

  const fetchMessages = useCallback(async (tok: string) => {
    setMessagesLoading(true);
    const res = await getAdminMessages(tok);
    setMessagesLoading(false);
    if (res.ok && res.data) {
      const mapped: WishMessage[] = (res.data as any[]).map((m) => ({
        id: String(m.seq ?? m._id ?? m.id),
        name: m.name || "",
        department: m.department || undefined,
        message: m.message || "",
        createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : (m.created_at || ""),
        hidden: m.hidden || m.status === "hidden",
      }));
      setMessages(mapped);
    } else if (res.status === 401) {
      // Token expired or invalid
      clearStoredToken();
      setToken(null);
      setLoginError("Session expired. Please log in again.");
    }
  }, []);

  // Fetch messages and subscribe to WebSocket updates when logged in
  useEffect(() => {
    if (!token) return;
    fetchMessages(token);
    fetchLiveState(token);

    const ws = getWebSocket();
    if (ws) {
      ws.connect();
      const unsub = ws.on("*", () => {
        fetchMessages(token);
      });
      const unsubLive = ws.on("live_state", (data: unknown) => {
        const d = data as { enabled: boolean };
        setLiveEnabled(d.enabled);
      });
      return () => {
        unsub();
        unsubLive();
      };
    }
  }, [token, fetchMessages]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const res = await adminLogin(password);
    setLoginLoading(false);

    if (res.ok && res.data) {
      storeToken(res.data.token);
      setToken(res.data.token);
      setPassword("");
    } else {
      setLoginError(res.error || "Login failed");
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm("Delete this message permanently?")) return;
    const res = await deleteMessage(token, id);
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } else if (res.status === 401) {
      clearStoredToken();
      setToken(null);
      setLoginError("Session expired. Please log in again.");
    }
  }

  async function handleToggleHide(id: string, currentHidden: boolean) {
    if (!token) return;
    const res = await hideMessage(token, id, !currentHidden);
    if (res.ok && res.data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, hidden: !currentHidden } : m))
      );
    } else if (res.status === 401) {
      clearStoredToken();
      setToken(null);
      setLoginError("Session expired. Please log in again.");
    }
  }

  function handleLogout() {
    clearStoredToken();
    setToken(null);
    setMessages([]);
  }

  async function fetchLiveState(tok: string) {
    if (!API_URL) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/live`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLiveEnabled(data.enabled);
      }
    } catch {}
  }

  async function handleToggleLive() {
    if (!token) return;
    if (!liveEnabled) {
      // Turning ON — no confirm needed
    } else {
      // Turning OFF — confirm
      if (!confirm("Stop accepting live wishes? The stream will show PAUSED.")) return;
    }
    setLiveLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/live`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: !liveEnabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiveEnabled(data.enabled);
        setLiveLastChanged(new Date().toLocaleTimeString());
      } else if (res.status === 401) {
        clearStoredToken();
        setToken(null);
        setLoginError("Session expired. Please log in again.");
      }
    } catch {}
    setLiveLoading(false);
  }

  // ─── Login form ───
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 chapter-paper">
        <div className="max-w-sm w-full">
          <h1
            className="font-display italic text-center mb-8"
            style={{ fontSize: "1.75rem", color: "var(--ink)" }}
          >
            Admin Panel
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block font-body mb-1.5"
                style={{ fontSize: "0.65rem", color: "var(--dhundh)" }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 font-body rounded-lg outline-none"
                style={{
                  border: "1px solid rgba(31,26,23,0.12)",
                  backgroundColor: "transparent",
                  color: "var(--ink)",
                }}
                autoFocus
              />
            </div>
            {loginError && (
              <p
                className="font-body"
                style={{ fontSize: "0.75rem", color: "var(--madder)" }}
              >
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 font-body rounded-lg transition-all disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: "var(--madder)",
                color: "var(--paper-1)",
                opacity: loginLoading ? 0.6 : 1,
              }}
            >
              {loginLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Message list ───
  return (
    <div className="min-h-screen chapter-paper px-6 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Live wishes card */}
        <div
          className="rounded-lg p-5 mb-8"
          style={{ border: "1px solid rgba(31,26,23,0.08)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: liveEnabled ? "var(--madder)" : "var(--ink-soft)",
                  animation: liveEnabled ? "pulse-dot 2s ease-in-out infinite" : undefined,
                }}
              />
              <div>
                <h2
                  className="font-body font-medium"
                  style={{ fontSize: "0.85rem", color: "var(--ink)" }}
                >
                  Live wishes
                </h2>
                <p
                  className="font-body"
                  style={{ fontSize: "0.7rem", color: "var(--ink-soft)" }}
                >
                  {liveEnabled ? "LIVE" : "STOPPED"}
                  {liveLastChanged && ` · Last changed ${liveLastChanged}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleLive}
              disabled={liveLoading}
              className="px-4 py-2 font-body rounded transition-opacity disabled:opacity-40 cursor-pointer"
              style={{
                fontSize: "0.75rem",
                backgroundColor: liveEnabled ? "var(--madder)" : "var(--ink)",
                color: "var(--paper-1)",
              }}
            >
              {liveLoading ? "..." : liveEnabled ? "Stop" : "Start"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1
            className="font-display italic"
            style={{ fontSize: "1.75rem", color: "var(--ink)" }}
          >
            Messages ({messages.length})
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => fetchMessages(token)}
              className="px-4 py-2 font-body rounded transition-colors cursor-pointer"
              style={{ fontSize: "0.75rem", border: "1px solid rgba(31,26,23,0.12)" }}
            >
              {messagesLoading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 font-body transition-colors cursor-pointer"
              style={{ fontSize: "0.75rem", color: "var(--dhundh)" }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-lg p-4"
              style={{
                border: "1px solid rgba(31,26,23,0.08)",
                opacity: msg.hidden ? 0.5 : 1,
                backgroundColor: msg.hidden
                  ? "rgba(31,26,23,0.02)"
                  : "transparent",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span
                      className="font-semibold font-body"
                      style={{ fontSize: "0.8rem", color: "var(--ink)" }}
                    >
                      {msg.name}
                    </span>
                    {msg.department && (
                      <span
                        className="font-body"
                        style={{ fontSize: "0.7rem", color: "var(--dhundh)" }}
                      >
                        {msg.department}
                      </span>
                    )}
                    <span
                      className="font-body"
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--dhundh)",
                        opacity: 0.5,
                      }}
                    >
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p
                    className="font-body"
                    style={{ fontSize: "0.8rem", color: "var(--dhundh)" }}
                  >
                    {msg.message}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleHide(msg.id, !!msg.hidden)}
                    className="px-3 py-1.5 font-body rounded transition-colors cursor-pointer"
                    style={{
                      fontSize: "0.65rem",
                      border: "1px solid rgba(31,26,23,0.12)",
                    }}
                  >
                    {msg.hidden ? "Show" : "Hide"}
                  </button>
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="px-3 py-1.5 font-body rounded transition-colors cursor-pointer"
                    style={{
                      fontSize: "0.65rem",
                      border: "1px solid rgba(158,59,37,0.3)",
                      color: "var(--madder)",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {messages.length === 0 && !messagesLoading && (
            <p
              className="text-center font-body py-12"
              style={{ color: "var(--dhundh)" }}
            >
              No messages yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
