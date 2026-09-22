"use client";

import React from "react";
import ScrollReveal from "./ScrollReveal";
import { quotes } from "@/lib/content";

export default function WordsOfAppreciation() {
  return (
    <section
      className="chapter-fog py-16 md:py-24 px-6 md:px-12"
      aria-label="Words of Appreciation"
    >
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <div className="mb-12 md:mb-16">
            <p
              className="font-body uppercase tracking-[0.2em] mb-3"
              style={{ fontSize: "0.6rem", color: "var(--dhundh)" }}
            >
              विचार
            </p>
            <h2
              className="font-display italic"
              style={{
                fontSize: "clamp(2rem, 5vw, 4rem)",
                fontWeight: 400,
                color: "var(--ink)",
                letterSpacing: "-0.02em",
              }}
            >
              Words of Appreciation
            </h2>
          </div>
        </ScrollReveal>

        <div>
          {quotes.map((quote, idx) => (
            <ScrollReveal key={quote.id} delay={idx * 80}>
              <blockquote
                className="py-6"
                style={{
                  borderBottom:
                    idx < quotes.length - 1
                      ? "1px solid rgba(31,26,23,0.08)"
                      : "none",
                  marginLeft: idx % 2 === 0 ? "0" : "clamp(1rem, 4vw, 3rem)",
                }}
              >
                <p
                  className="font-display mb-3"
                  style={{
                    fontSize: "clamp(1rem, 1.8vw, 1.3rem)",
                    fontWeight: 400,
                    lineHeight: 1.55,
                    color: "var(--ink)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  &ldquo;{quote.text}&rdquo;
                </p>
                <footer>
                  <cite
                    className="font-body not-italic block"
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--dhundh)",
                      fontVariant: "small-caps",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {quote.attribution}
                    {quote.role && (
                      <span> — {quote.role}</span>
                    )}
                  </cite>
                </footer>
              </blockquote>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
