"use client";

import { useEffect, useState, useRef } from "react";
import StreamLanes from "@/components/StreamLanes";
import { getMessages, type WishMessage } from "@/lib/api";
import { getWebSocket } from "@/lib/websocket";

export default function DisplayPage() {
  const [messages, setMessages] = useState<WishMessage[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [liveEnabled, setLiveEnabled] = useState(true);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    getMessages().then((res) => {
      if (res.ok && res.data) setMessages(res.data.filter((m) => !m.hidden));
    });

    const ws = getWebSocket();
    if (ws) {
      ws.connect();
      const unsubMsg = ws.on("message", (data: unknown) => {
        const msg = data as WishMessage;
        setMessages((prev) => [...prev, msg]);
      });
      const unsubLive = ws.on("live_state", (data: unknown) => {
        const d = data as { enabled: boolean };
        setLiveEnabled(d.enabled);
      });
      const unsubStatus = ws.onStatus((status) => {
        setWsStatus(status);
      });
      return () => {
        unsubMsg();
        unsubLive();
        unsubStatus();
      };
    }
  }, []);

  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {}
    }
    requestWakeLock();
    return () => { wakeLockRef.current?.release(); };
  }, []);

  const streamMessages = messages.map((m) => ({
    id: m.id,
    name: m.name,
    message: m.message,
  }));

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{ backgroundColor: "var(--night)", color: "var(--ivory)", cursor: "none" }}
    >
      <style>{`
        body { overflow: hidden !important; }
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Name centered */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 text-center">
        <h1
          className="font-display italic"
          style={{ fontSize: "clamp(2rem, 5vw, 4rem)", color: "var(--ivory)" }}
        >
          Santosh Choubey
        </h1>
        <p
          className="font-body uppercase tracking-[0.3em] mt-2"
          style={{ fontSize: "0.6rem", color: "rgba(243,235,221,0.4)" }}
        >
          71 Years
        </p>
      </div>

      {/* Stream lanes */}
      <div className="absolute inset-0 z-5 pointer-events-none">
        <StreamLanes
          messages={streamMessages}
          maxVisible={40}
          className="h-full"
        />
      </div>

      {/* QR code in corner */}
      <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: "rgba(243,235,221,0.05)",
            border: "1px solid rgba(243,235,221,0.1)",
          }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
              typeof window !== "undefined" ? window.location.origin + "/send" : ""
            )}&bgcolor=221915&color=F3EBDD&margin=4`}
            alt="QR code to send wishes"
            width={100}
            height={100}
          />
          <p
            className="mt-1 font-body text-center"
            style={{ fontSize: "0.55rem", color: "rgba(243,235,221,0.4)" }}
          >
            Scan to wish
          </p>
        </div>
      </div>

      {/* Connection indicator */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        {!liveEnabled && (
          <span
            className="font-body uppercase tracking-[0.15em]"
            style={{ fontSize: "0.65rem", color: "var(--ink-soft)" }}
          >
            Paused
          </span>
        )}
        <div
          className={`w-2 h-2 rounded-full ${
            wsStatus === "connected"
              ? liveEnabled ? "bg-[#9E3B25]" : "bg-[rgba(31,26,23,0.3)]"
              : wsStatus === "connecting"
              ? "bg-yellow-400 animate-pulse"
              : "bg-red-400"
          }`}
          title={`WebSocket: ${wsStatus}`}
        />
      </div>
    </div>
  );
}
