"use client";

import { useState, useEffect } from "react";

export default function LanguageToggle() {
  const [lang, setLang] = useState<"en" | "hi">("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as "en" | "hi" | null;
    if (saved === "hi" || saved === "en") {
      setLang(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const toggle = () => {
    const next = lang === "en" ? "hi" : "en";
    setLang(next);
    localStorage.setItem("lang", next);
    document.documentElement.lang = next;
  };

  return (
    <button
      onClick={toggle}
      className="fixed top-4 left-4 z-40 font-body px-2 py-0.5 rounded transition-colors cursor-pointer"
      style={{
        fontSize: "0.6rem",
        letterSpacing: "0.05em",
        border: "1px solid rgba(31,26,23,0.15)",
        color: "var(--ink)",
        background: "transparent",
      }}
      aria-label={`Switch to ${lang === "en" ? "Hindi" : "English"}`}
    >
      {lang === "en" ? "हिं" : "EN"}
    </button>
  );
}
