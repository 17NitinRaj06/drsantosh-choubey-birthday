"use client";

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useRealtime } from "@/lib/RealtimeContext";

const MAX_COLUMN = 100;
const SCROLL_FOLLOW_THRESHOLD = 80;
const MAX_CHARS = 240;

export default function ChatStream() {
  const { messages, status, liveEnabled, send: wsSend } = useRealtime();
  const [composerOpen, setComposerOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);
  const [followNew, setFollowNew] = useState(true);
  const [overscrollContain, setOverscrollContain] = useState(true);

  const connected = status === "ready";

  // Detect chapter behind the chat panel via IntersectionObserver
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const check = () => {
      const cx = panel.getBoundingClientRect().left + panel.offsetWidth / 2;
      const cy = panel.getBoundingClientRect().top + panel.offsetHeight / 2;
      const el = document.elementFromPoint(cx, cy);
      if (!el) return;
      const section = el.closest("section[data-chapter]");
      if (section) {
        const cls = section.className;
        setIsDark(
          cls.includes("chapter-night") ||
          cls.includes("chapter-deep-slate") ||
          cls.includes("chapter-ink")
        );
      }
    };

    check();
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => { check(); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Responsive overscroll-behavior
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1100px)");
    setOverscrollContain(mql.matches);
    const handler = (e: MediaQueryListEvent) => setOverscrollContain(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Derive visible messages: cap at MAX_COLUMN
  const allVisible = useMemo(() => messages.slice(-MAX_COLUMN), [messages]);
  const prevCountRef = useRef(allVisible.length);

  // Auto-follow: detect near-bottom BEFORE new content arrives, scroll after render
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = allVisible.length > prevCountRef.current;
    prevCountRef.current = allVisible.length;

    if (grew && followNew) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [allVisible, followNew]);

  const send = useCallback(() => {
    if (!name.trim() || !message.trim() || sending) return;

    setSending(true);
    wsSend({ name: name.trim(), message: message.trim() });

    setSent(true);
    setTimeout(() => {
      setComposerOpen(false);
      setSent(false);
      setName("");
      setMessage("");
      setSending(false);
    }, 1200);
  }, [name, message, sending, wsSend]);

  const remaining = MAX_CHARS - message.length;

  // Scroll event handler: detect if near bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setFollowNew(distanceFromBottom < SCROLL_FOLLOW_THRESHOLD);
  }, []);

  // Keyboard navigation for the scroll container
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientHeight * 0.8;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        el.scrollTop -= 40;
        break;
      case "ArrowDown":
        e.preventDefault();
        el.scrollTop += 40;
        break;
      case "PageUp":
        e.preventDefault();
        el.scrollTop -= scrollAmount;
        break;
      case "PageDown":
        e.preventDefault();
        el.scrollTop += scrollAmount;
        break;
      case "Home":
        e.preventDefault();
        el.scrollTop = 0;
        break;
      case "End":
        e.preventDefault();
        el.scrollTop = el.scrollHeight;
        break;
      case "Tab":
        // Let Tab move focus out of the container naturally
        break;
    }
  }, []);

  return (
    <>
      {/* Chat panel — bottom-left on desktop, 360px wide, max 45vh */}
      <div
        ref={panelRef}
        className={`hidden md:flex fixed z-40 flex-col ${isDark ? "chat-saturated" : "chat-light"}`}
        style={{
          width: "360px",
          maxHeight: "45vh",
          left: "max(16px, env(safe-area-inset-left))",
          bottom: "max(16px, env(safe-area-inset-bottom))",
          pointerEvents: "none",
        }}
      >
        {/* Header — pulsing dot + LIVE/PAUSED */}
        <div className="flex items-center gap-2 px-4 py-2" style={{ pointerEvents: "auto" }}>
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              backgroundColor: !liveEnabled ? "var(--ink-soft)" : connected ? "var(--madder)" : "var(--ink-soft)",
              animation: liveEnabled && connected ? "pulse-dot 2s ease-in-out infinite" : undefined,
            }}
          />
          <span
            className="font-body uppercase tracking-[0.1em]"
            style={{
              fontSize: "0.55rem",
              color: !liveEnabled ? "var(--ink-soft)" : connected ? "var(--madder)" : "var(--ink-soft)",
            }}
          >
            {liveEnabled ? "LIVE" : "PAUSED"}
          </span>
          {status === "offline" && (
            <span
              className="font-body"
              style={{ fontSize: "0.5rem", color: "var(--dhundh)" }}
            >
              reconnecting…
            </span>
          )}
        </div>

        {/* Messages — scrollable, hidden scrollbar, pointer-events auto */}
        <div
          ref={scrollRef}
          className="chat-scrollbar-hidden flex-1 flex flex-col overflow-y-auto overflow-x-hidden px-4 pb-2"
          style={{
            maxHeight: "calc(45vh - 80px)",
            pointerEvents: "auto",
            overscrollBehavior: overscrollContain ? "contain" : "auto",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 30%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%)",
          }}
          role="list"
          aria-label="Birthday wishes"
          tabIndex={0}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
        >
          {allVisible.map((msg) => (
            <div
              key={msg.clientId || msg.id}
              className="animate-[message-enter_0.3s_ease-out]"
              style={{ animationFillMode: "both", pointerEvents: "auto" }}
            >
              <p
                className="font-body"
                style={{
                  fontSize: "clamp(17px, 2.4vw, 19px)",
                  lineHeight: 1.35,
                  fontWeight: 600,
                  color: "var(--chat-text)",
                  textShadow: "0 0 1px var(--chat-halo), 0 0 3px var(--chat-halo), 0 0 6px var(--chat-halo), 0 0 12px var(--chat-halo)",
                  marginBottom: "2px",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {msg.message}
              </p>
              <span
                className="font-body"
                style={{
                  fontSize: "clamp(12px, 1.7vw, 13px)",
                  fontWeight: 800,
                  fontVariant: "small-caps",
                  letterSpacing: "0.06em",
                  color: "var(--chat-text)",
                  textShadow: "0 0 1px var(--chat-halo), 0 0 3px var(--chat-halo), 0 0 6px var(--chat-halo), 0 0 12px var(--chat-halo)",
                }}
              >
                {msg.name}
              </span>
            </div>
          ))}
        </div>

        {/* Composer — pill-based inline */}
        <div className="px-4 pb-4 pt-2" style={{ pointerEvents: "auto" }}>
          {sent ? (
            <div
              className="text-center py-3"
              style={{
                fontSize: "0.75rem",
                color: "var(--madder)",
              }}
            >
              Sent!
            </div>
          ) : composerOpen ? (
            <div className="space-y-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 font-body rounded-full outline-none"
                style={{
                  fontSize: "0.75rem",
                  border: "1px solid rgba(31,26,23,0.12)",
                  backgroundColor: "transparent",
                  color: "var(--ink)",
                }}
                maxLength={60}
                autoFocus
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="Write a wish..."
                  className="flex-1 px-3 py-2 font-body rounded-full outline-none"
                  style={{
                    fontSize: "0.75rem",
                    border: "1px solid rgba(31,26,23,0.12)",
                    backgroundColor: "transparent",
                    color: "var(--ink)",
                  }}
                  maxLength={MAX_CHARS}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim() && message.trim()) {
                      send();
                    }
                  }}
                />
                <button
                  className="px-4 py-2 rounded-full font-body"
                  style={{
                    fontSize: "0.65rem",
                    letterSpacing: "0.06em",
                    backgroundColor:
                      !name.trim() || !message.trim()
                        ? "var(--stone)"
                        : "var(--madder)",
                    color:
                      !name.trim() || !message.trim()
                        ? "var(--dhundh)"
                        : "var(--paper)",
                    cursor:
                      !name.trim() || !message.trim() || sending
                        ? "not-allowed"
                        : "pointer",
                  }}
                  onClick={send}
                  disabled={!name.trim() || !message.trim() || sending}
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
              <p
                className="text-right font-body"
                style={{
                  fontSize: "0.55rem",
                  color: remaining < 20 ? "var(--madder)" : "var(--dhundh)",
                }}
              >
                {remaining}
              </p>
            </div>
          ) : (
            <button
              className="w-full py-2.5 rounded-full font-body"
              style={{
                fontSize: "0.65rem",
                letterSpacing: "0.08em",
                border: "1px solid rgba(31,26,23,0.12)",
                color: "var(--ink)",
                background: "transparent",
                cursor: "pointer",
              }}
              onClick={() => setComposerOpen(true)}
            >
              Send a wish
            </button>
          )}
        </div>
      </div>

      {/* Mobile: floating Wish pill */}
      <button
        className="md:hidden fixed z-50 px-5 py-3 rounded-full font-body"
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.08em",
          backgroundColor: "var(--madder)",
          color: "var(--paper)",
          boxShadow: "0 4px 16px rgba(176,58,30,0.3)",
          bottom: "max(24px, env(safe-area-inset-bottom))",
          right: "max(24px, env(safe-area-inset-right))",
        }}
        onClick={() => setComposerOpen(!composerOpen)}
      >
        Wish
      </button>

      {/* Mobile composer overlay */}
      {composerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex items-end"
          style={{ backgroundColor: "rgba(31,26,23,0.4)" }}
          onClick={() => setComposerOpen(false)}
        >
          <div
            className="w-full p-6 rounded-t-xl"
            style={{ backgroundColor: "var(--paper)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {sent ? (
              <div className="text-center py-6">
                <p className="font-display" style={{ color: "var(--madder)" }}>
                  शुभकामना!
                </p>
                <p
                  className="font-body mt-2"
                  style={{ fontSize: "0.8rem", color: "var(--dhundh)" }}
                >
                  Your wish has been sent.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 font-body rounded-lg outline-none"
                  style={{
                    fontSize: "0.85rem",
                    border: "1px solid rgba(31,26,23,0.12)",
                    backgroundColor: "transparent",
                    color: "var(--ink)",
                  }}
                  autoFocus
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="Write your wish..."
                  rows={3}
                  className="w-full px-4 py-3 font-body rounded-lg outline-none resize-none"
                  style={{
                    fontSize: "0.85rem",
                    border: "1px solid rgba(31,26,23,0.12)",
                    backgroundColor: "transparent",
                    color: "var(--ink)",
                  }}
                />
                <div className="flex items-center justify-between">
                  <span
                    className="font-body"
                    style={{
                      fontSize: "0.6rem",
                      color:
                        remaining < 20 ? "var(--madder)" : "var(--dhundh)",
                    }}
                  >
                    {remaining}
                  </span>
                  <button
                    className="px-6 py-3 rounded-lg font-body"
                    style={{
                      fontSize: "0.75rem",
                      letterSpacing: "0.06em",
                      backgroundColor:
                        !name.trim() || !message.trim()
                          ? "var(--stone)"
                          : "var(--madder)",
                      color:
                        !name.trim() || !message.trim()
                          ? "var(--dhundh)"
                          : "var(--paper)",
                    }}
                    onClick={send}
                    disabled={!name.trim() || !message.trim() || sending}
                  >
                    {sending ? "Sending..." : "Send Wish"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
