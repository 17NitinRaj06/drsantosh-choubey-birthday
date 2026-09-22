"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "intro-seen-v3";
const SKIP_PATHS = ["/send", "/display"];

export default function IntroAnimation() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"draw" | "fade" | "done">("draw");
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP_PATHS.includes(pathname)) return;

    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen) {
      setPhase("done");
      return;
    }

    setVisible(true);

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setPhase("done");
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, "1");
      return;
    }

    const drawTimer = setTimeout(() => setPhase("fade"), 1400);
    const fadeTimer = setTimeout(() => {
      setPhase("done");
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, "1");
    }, 2200);

    return () => {
      clearTimeout(drawTimer);
      clearTimeout(fadeTimer);
    };
  }, [pathname]);

  const skip = () => {
    setPhase("done");
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-700"
      style={{
        backgroundColor: "var(--paper)",
        opacity: phase === "fade" ? 0 : 1,
        pointerEvents: phase === "fade" ? "none" : "auto",
      }}
      role="status"
      aria-label="Loading"
    >
      {/* Diya line draw animation */}
      <div
        className="mb-6"
        style={{
          color: "var(--ink)",
          animation: "diya-draw 1.2s ease-out forwards",
        }}
      >
        <svg
          width="120"
          height="60"
          viewBox="0 0 120 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ strokeDasharray: 400, strokeDashoffset: 400 }}
        >
          <path
            d="M60 50 C60 50 45 40 45 33 C45 27 50 23 60 23 C70 23 75 27 75 33 C75 40 60 50 60 50Z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <ellipse
            cx="60"
            cy="53"
            rx="16"
            ry="5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M60 23 C60 17 57 12 60 6 C63 12 60 17 60 23"
            stroke="var(--madder)"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Skip button */}
      <button
        className="absolute bottom-8 font-body uppercase tracking-widest"
        style={{
          fontSize: "0.6rem",
          color: "var(--dhundh)",
          letterSpacing: "0.12em",
        }}
        onClick={skip}
        aria-label="Skip intro animation"
      >
        Skip
      </button>
    </div>
  );
}
