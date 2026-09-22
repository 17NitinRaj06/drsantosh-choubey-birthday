"use client";

import { useEffect, useRef, useState } from "react";

interface StreamMessage {
  id: string;
  name: string;
  message: string;
}

interface StreamLanesProps {
  messages: StreamMessage[];
  maxVisible?: number;
  className?: string;
}

const LANE_COUNT = 5;

export default function StreamLanes({
  messages,
  maxVisible = 25,
  className = "",
}: StreamLanesProps) {
  const [visible, setVisible] = useState<StreamMessage[]>([]);
  const laneIndex = useRef(0);
  const msgIndex = useRef(0);

  useEffect(() => {
    if (messages.length === 0) return;

    const interval = setInterval(() => {
      if (msgIndex.current >= messages.length) {
        msgIndex.current = 0;
      }

      const msg = messages[msgIndex.current];
      msgIndex.current++;

      setVisible((prev) => {
        const next = [...prev, { ...msg, _lane: laneIndex.current }].slice(
          -maxVisible
        );
        return next;
      });

      laneIndex.current = (laneIndex.current + 1) % LANE_COUNT;
    }, 2500);

    return () => clearInterval(interval);
  }, [messages, maxVisible]);

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      aria-live="polite"
      aria-label="Live wishes stream"
    >
      {[...Array(LANE_COUNT)].map((_, lane) => (
        <div
          key={lane}
          className="flex gap-3 py-1 whitespace-nowrap overflow-hidden"
        >
          {visible
            .filter((_, i) => i % LANE_COUNT === lane)
            .map((msg, i) => (
              <span
                key={`${msg.id}-${i}`}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-body animate-[slide-in-left_0.5s_ease-out]"
                style={{
                  fontSize: "0.8rem",
                  backgroundColor: "rgba(243,235,221,0.1)",
                  border: "1px solid rgba(243,235,221,0.15)",
                  color: "var(--paper)",
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <span
                  className="font-medium text-xs uppercase tracking-wide"
                  style={{ color: "var(--madder)" }}
                >
                  {msg.name}
                </span>
                <span style={{ color: "rgba(243,235,221,0.3)" }}>·</span>
                <span className="max-w-[280px] truncate">{msg.message}</span>
              </span>
            ))}
        </div>
      ))}
    </div>
  );
}
