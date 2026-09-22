"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ScrollReveal from "./ScrollReveal";
import { useRealtime } from "@/lib/RealtimeContext";
import { API_URL, PUBLIC_URL } from "@/lib/config";

interface WishRow {
  id: string;
  name: string;
  department?: string;
  message: string;
  timestamp: number;
}

const PAGE_SIZE = 50;

function WishItem({ wish }: { wish: WishRow }) {
  const timeStr = useMemo(() => {
    const d = new Date(wish.timestamp);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [wish.timestamp]);

  return (
    <div
      className="font-body"
      style={{
        padding: "14px 0",
        borderBottom: "1px solid var(--wish-rule)",
        animation: "message-enter 200ms ease forwards",
      }}
    >
      <p
        className="font-display italic"
        style={{
          fontSize: "18px",
          lineHeight: 1.5,
          fontWeight: 500,
          color: "var(--wish-msg)",
          marginBottom: "4px",
        }}
      >
        {wish.message}
      </p>
      <p
        className="font-body"
        style={{
          fontSize: "0.65rem",
          fontVariant: "small-caps",
          letterSpacing: "0.05em",
          fontWeight: 600,
          color: "var(--wish-name)",
        }}
      >
        {wish.name}
        {wish.department && (
          <span style={{ fontWeight: 400 }}> · {wish.department}</span>
        )}
        <span style={{ fontWeight: 400, color: "var(--wish-meta)" }}>
          {" "} · {timeStr}
        </span>
      </p>
    </div>
  );
}

function WishList({
  wishes,
  scrollRef,
  onScroll,
  height,
  className,
  focusClass,
}: {
  wishes: WishRow[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  height: string;
  className?: string;
  focusClass?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: wishes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  // Intersection observer for "load more"
  useEffect(() => {
    const el = endRef.current;
    const root = scrollRef.current;
    if (!el || !root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Dispatch custom event to trigger load
          root.dispatchEvent(new CustomEvent("load-more"));
        }
      },
      { root, threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [scrollRef, wishes.length]);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      role="list"
      aria-label="Birthday wishes"
      tabIndex={0}
      className={focusClass}
      style={{
        height,
        overflowY: "auto",
        overscrollBehavior: "contain",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(243,235,221,0.15) transparent",
      }}
    >
      {wishes.length > 0 && (
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const wish = wishes[virtualRow.index];
            return (
              <div
                key={wish.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <WishItem wish={wish} />
              </div>
            );
          })}
        </div>
      )}
      <div ref={endRef} style={{ height: 1 }} />
    </div>
  );
}

export default function WishesWall() {
  const { messages: liveMessages, status, liveEnabled } = useRealtime();
  const [history, setHistory] = useState<WishRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [scrolledDown, setScrolledDown] = useState(false);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "idle" || status === "connecting";
  const isOffline = status === "offline";
  const isEmpty = !isLoading && history.length === 0 && liveMessages.length === 0;

  // Merge: live newest + history oldest, dedupe by id
  const allWishes = useMemo(() => {
    const liveIds = new Set(liveMessages.map((m) => m.id));
    const histFiltered = history.filter((h) => !liveIds.has(h.id));
    return [...liveMessages, ...histFiltered];
  }, [liveMessages, history]);

  // Fetch total count
  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/api/messages/count`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: any) => {
        if (data && typeof data.count === "number") setTotalCount(data.count);
      })
      .catch(() => {});
  }, [API_URL]);

  const mapResponse = useCallback((data: any[]): WishRow[] => {
    return data.map((m) => ({
      id: String(m.seq || m._id || m.id),
      name: m.name || "",
      department: m.department || undefined,
      message: m.message || "",
      timestamp: m.createdAt ? new Date(m.createdAt).getTime() : (m.created_at ? new Date(m.created_at).getTime() : Date.now()),
    }));
  }, []);

  // Initial history load
  useEffect(() => {
    if (!API_URL) return;
    setLoadingMore(true);
    fetch(`${API_URL}/api/messages?limit=${PAGE_SIZE}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          const rows = mapResponse(data);
          setHistory(rows);
          if (rows.length < PAGE_SIZE) setHasMore(false);
        }
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  }, [API_URL, mapResponse]);

  // Load older pages
  const loadOlder = useCallback(() => {
    if (loadingMore || !hasMore || !API_URL || history.length === 0) return;
    const oldestSeq = history[history.length - 1]?.id;
    if (!oldestSeq) return;
    setLoadingMore(true);
    fetch(`${API_URL}/api/messages?before=${oldestSeq}&limit=${PAGE_SIZE}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          const rows = mapResponse(data);
          setHistory((prev) => [...prev, ...rows]);
          if (rows.length < PAGE_SIZE) setHasMore(false);
        }
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  }, [loadingMore, hasMore, API_URL, history, mapResponse]);

  // Track new live wishes when scrolled down
  useEffect(() => {
    if (scrolledDown && liveMessages.length > 0) {
      setNewCount((prev) => prev + 1);
    }
  }, [liveMessages.length, scrolledDown]);

  const scrollToTop = useCallback(() => {
    desktopScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    mobileScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setNewCount(0);
  }, []);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = desktopScrollRef.current || mobileScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setScrolledDown(atBottom);
    if (!atBottom) setNewCount(0);
  }, []);

  // Listen for load-more events from intersection observer
  useEffect(() => {
    const el = desktopScrollRef.current;
    if (!el) return;
    const handler = () => loadOlder();
    el.addEventListener("load-more", handler);
    return () => el.removeEventListener("load-more", handler as EventListener);
  }, [loadOlder]);

  useEffect(() => {
    const el = mobileScrollRef.current;
    if (!el) return;
    const handler = () => loadOlder();
    el.addEventListener("load-more", handler);
    return () => el.removeEventListener("load-more", handler as EventListener);
  }, [loadOlder]);

  const siteUrl = PUBLIC_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const qrUrl = `${siteUrl}/send`;
  const encodedQr = encodeURIComponent(qrUrl);

  const loadingLine = loadingMore && (
    <p
      className="font-body text-center py-4"
      style={{ fontSize: "0.7rem", color: "rgba(243,235,221,0.3)" }}
    >
      Loading older wishes…
    </p>
  );

  const endLine = !hasMore && allWishes.length > 0 && (
    <p
      className="font-body text-center py-4"
      style={{ fontSize: "0.7rem", color: "rgba(243,235,221,0.2)" }}
    >
      You have reached the first wish
    </p>
  );

  return (
    <section
      id="wishes"
      className="chapter-deep-slate py-16 md:py-24 px-6 md:px-12"
      aria-label="Birthday Wishes"
      data-chapter="wishes"
      data-testid="wishes-state"
      data-state={status}
    >
      <div className="max-w-6xl mx-auto">
        {/* Heading row */}
        <ScrollReveal>
          <div className="flex items-baseline gap-3 mb-8">
            <h2
              className="font-display italic"
              style={{
                fontSize: "clamp(2rem, 5vw, 4rem)",
                fontWeight: 400,
                color: "var(--paper)",
                letterSpacing: "-0.02em",
              }}
            >
              Birthday Wishes
            </h2>
            {totalCount > 0 && (
              <span
                className="font-body"
                style={{
                  fontSize: "0.7rem",
                  fontVariant: "small-caps",
                  letterSpacing: "0.08em",
                  color: "rgba(243,235,221,0.4)",
                }}
              >
                {totalCount.toLocaleString("en-IN")} wishes
              </span>
            )}
            {status === "ready" && (
              <span
                className="font-body flex items-center gap-1.5"
                style={{ fontSize: "0.65rem", color: liveEnabled ? "var(--madder)" : "rgba(243,235,221,0.4)" }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: liveEnabled ? "var(--madder)" : "rgba(243,235,221,0.3)",
                  }}
                />
                {liveEnabled ? "Live" : "Paused"}
              </span>
            )}
          </div>
        </ScrollReveal>

        {/* Offline note */}
        {isOffline && (
          <p
            className="font-body mb-4"
            style={{ fontSize: "0.7rem", color: "rgba(243,235,221,0.3)" }}
          >
            Reconnecting…
          </p>
        )}

        {/* Desktop: two columns */}
        <div className="hidden md:grid md:grid-cols-[7fr_4fr] md:gap-8 lg:gap-12 items-start">
          {/* LEFT: scrollable wish list */}
          <div className="relative">
            {/* New wishes pill */}
            {newCount > 0 && (
              <button
                onClick={scrollToTop}
                className="absolute top-0 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full font-body cursor-pointer"
                style={{
                  fontSize: "0.65rem",
                  backgroundColor: "var(--madder)",
                  color: "var(--paper)",
                  boxShadow: "0 2px 8px rgba(176,58,30,0.4)",
                }}
              >
                {newCount} new {newCount === 1 ? "wish" : "wishes"}
              </button>
            )}

            {isEmpty && !loadingMore ? (
              <div className="py-12 text-center" data-testid="wishes-empty">
                <p className="font-display" style={{ color: "rgba(243,235,221,0.4)" }}>
                  शुभकामनायाँ यहाँ आएँगी
                </p>
                <p
                  className="font-body mt-2"
                  style={{ fontSize: "0.8rem", color: "rgba(243,235,221,0.25)" }}
                >
                  Be the first to send a wish. Scan the code or press Wish.
                </p>
              </div>
            ) : (
              <WishList
                wishes={allWishes}
                scrollRef={desktopScrollRef}
                onScroll={handleScroll}
                height="clamp(420px, 70vh, 640px)"
                focusClass="focus:outline-none focus:ring-2 focus:ring-[var(--madder)] focus:ring-offset-2 focus:ring-offset-[var(--night)]"
              />
            )}
            {loadingLine}
            {endLine}
          </div>

          {/* RIGHT: sticky QR card */}
          <div
            className="hidden md:block"
            style={{ position: "sticky", top: "96px" }}
          >
            <div className="flex flex-col items-center">
              <p
                className="font-body mb-3"
                style={{
                  fontSize: "0.65rem",
                  fontVariant: "small-caps",
                  letterSpacing: "0.08em",
                  color: "rgba(243,235,221,0.4)",
                }}
              >
                Scan to send your wishes
              </p>
              <div
                className="flex items-center justify-center"
                style={{
                  width: "220px",
                  height: "220px",
                  backgroundColor: "var(--paper-1)",
                  borderRadius: "4px",
                  padding: "16px",
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=188x188&data=${encodedQr}&bgcolor=F6F0E4&color=1F1A17&margin=0`}
                  alt="QR code to send wishes"
                  width={188}
                  height={188}
                  loading="lazy"
                  decoding="async"
                  style={{ display: "block" }}
                />
              </div>
              <p
                className="font-body mt-3 text-center break-all"
                style={{ fontSize: "0.6rem", color: "rgba(243,235,221,0.3)" }}
              >
                {qrUrl}
              </p>
              <a
                href="/send"
                className="font-body mt-2 hover:opacity-70 transition-opacity"
                style={{ fontSize: "0.65rem", color: "var(--madder)" }}
              >
                Open the wish form →
              </a>
            </div>
          </div>
        </div>

        {/* Mobile: single column */}
        <div className="md:hidden">
          <a
            href="/send"
            className="block w-full text-center py-3 rounded-lg font-body mb-6"
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.06em",
              border: "1px solid rgba(243,235,221,0.15)",
              color: "var(--paper)",
            }}
          >
            Send a wish
          </a>

          {isEmpty && !loadingMore ? (
            <div className="py-12 text-center" data-testid="wishes-empty">
              <p className="font-display" style={{ color: "rgba(243,235,221,0.4)" }}>
                शुभकामनायाँ यहाँ आएँगी
              </p>
              <p
                className="font-body mt-2"
                style={{ fontSize: "0.8rem", color: "rgba(243,235,221,0.25)" }}
              >
                Be the first to send a wish. Scan the code or press Wish.
              </p>
            </div>
          ) : (
            <WishList
              wishes={allWishes}
              scrollRef={mobileScrollRef}
              onScroll={handleScroll}
              height="60vh"
              focusClass="focus:outline-none focus:ring-2 focus:ring-[var(--madder)]"
            />
          )}
          {loadingLine}
          {endLine}
        </div>
      </div>
    </section>
  );
}
