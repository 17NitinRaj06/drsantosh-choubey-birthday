"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { chapters } from "@/lib/content";

export default function ContentsPill() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChapter, setActiveChapter] = useState("cover");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Track which chapter is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-chapter");
            if (id) setActiveChapter(id);
          }
        }
      },
      { threshold: 0.3 }
    );

    const sections = document.querySelectorAll("[data-chapter]");
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const navigate = useCallback(
    (id: string) => {
      const el = document.querySelector(`[data-chapter="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        setIsOpen(false);
      }
    },
    []
  );

  const activeLabel =
    activeChapter === "cover"
      ? "Cover"
      : chapters.find((c) => c.id === activeChapter)?.title || "";

  return (
    <>
      {/* Pill button — fixed bottom-right */}
      <button
        className="contents-pill"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open chapter index"
        style={{ display: isOpen ? "none" : undefined }}
      >
        {activeLabel || "Contents"}
      </button>

      {/* Full-screen index overlay */}
      {isOpen && (
        <div
          ref={overlayRef}
          className="chapter-index-overlay"
          onClick={(e) => {
            if (e.target === overlayRef.current) setIsOpen(false);
          }}
        >
          <nav className="w-full max-w-lg px-8">
            <p
              className="font-body uppercase tracking-[0.2em] mb-8"
              style={{
                fontSize: "0.65rem",
                color: "rgba(243,235,221,0.4)",
              }}
            >
              Contents
            </p>

            {/* Cover */}
            <button
              className="w-full text-left py-3 border-b flex items-center justify-between group"
              style={{ borderColor: "rgba(243,235,221,0.08)" }}
              onClick={() => navigate("cover")}
            >
              <span
                className="font-display italic"
                style={{
                  fontSize: "1.25rem",
                  color:
                    activeChapter === "cover"
                      ? "var(--madder)"
                      : "var(--paper)",
                }}
              >
                Cover
              </span>
            </button>

            {/* Chapters */}
            {chapters.map((ch) => (
              <button
                key={ch.id}
                className="w-full text-left py-3 border-b flex items-center justify-between group"
                style={{ borderColor: "rgba(243,235,221,0.08)" }}
                onClick={() => navigate(ch.id)}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className="font-body tabular-nums"
                    style={{
                      fontSize: "0.6rem",
                      color: "rgba(243,235,221,0.3)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {String(ch.num).padStart(2, "0")}
                  </span>
                  <span
                    className="font-display italic"
                    style={{
                      fontSize: "1.25rem",
                      color:
                        activeChapter === ch.id
                          ? "var(--madder)"
                          : "var(--paper)",
                    }}
                  >
                    {ch.title}
                  </span>
                </div>
                <span
                  className="font-body tabular-nums"
                  style={{
                    fontSize: "0.6rem",
                    color: "rgba(243,235,221,0.25)",
                  }}
                >
                  {ch.year}
                </span>
              </button>
            ))}

            {/* Wishes */}
            <button
              className="w-full text-left py-3 border-b flex items-center justify-between"
              style={{ borderColor: "rgba(243,235,221,0.08)" }}
              onClick={() => navigate("wishes")}
            >
              <span
                className="font-display italic"
                style={{
                  fontSize: "1.25rem",
                  color:
                    activeChapter === "wishes"
                      ? "var(--madder)"
                      : "var(--paper)",
                }}
              >
                Wishes
              </span>
            </button>

            {/* Close hint */}
            <p
              className="font-body mt-8 text-center"
              style={{
                fontSize: "0.6rem",
                color: "rgba(243,235,221,0.25)",
                letterSpacing: "0.08em",
              }}
            >
              ESC to close
            </p>
          </nav>
        </div>
      )}
    </>
  );
}
