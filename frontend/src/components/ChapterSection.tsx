"use client";

import Image from "next/image";
import ScrollReveal from "./ScrollReveal";
import type { Chapter } from "@/lib/content";

const colorMap: Record<string, string> = {
  paper: "chapter-paper",
  stone: "chapter-stone",
  fog: "chapter-fog",
  sage: "chapter-sage",
  night: "chapter-night",
};

export default function ChapterSection({ chapter }: { chapter: Chapter }) {
  const colorClass = colorMap[chapter.color] || "chapter-paper";
  const isDark = chapter.color === "night";
  const imgOnRight = chapter.imagePosition !== "left";

  return (
    <section
      className={`${colorClass} relative py-16 md:py-24 lg:py-32`}
      data-chapter={chapter.id}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        {/* Chapter number — top left */}
        <ScrollReveal>
          <p
            className="font-body uppercase tracking-[0.2em] mb-8 md:mb-12"
            style={{
              fontSize: "0.6rem",
              color: isDark ? "rgba(243,235,221,0.5)" : "var(--dhundh)",
            }}
          >
            Chapter {String(chapter.num).padStart(2, "0")}
          </p>
        </ScrollReveal>

        {/* Asymmetric grid: text + image */}
        <div
          className={`grid gap-8 md:gap-12 lg:gap-16 items-start ${
            imgOnRight
              ? "md:grid-cols-[1fr_1.2fr]"
              : "md:grid-cols-[1.2fr_1fr]"
          }`}
        >
          {/* Text column */}
          <div className={imgOnRight ? "" : "md:order-2"}>
            {/* Year */}
            <ScrollReveal delay={100}>
              <p
                className="font-display leading-none mb-4"
                style={{
                  fontSize: "clamp(3rem, 8vw, 7rem)",
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                  color: isDark
                    ? "rgba(243,235,221,0.12)"
                    : "rgba(31,26,23,0.1)",
                }}
              >
                {chapter.year}
              </p>
            </ScrollReveal>

            {/* Title — massive italic serif */}
            <ScrollReveal delay={200}>
              <h2
                className="font-display italic leading-[0.95] mb-2"
                style={{
                  fontSize: "clamp(2rem, 6vw, 5rem)",
                  fontWeight: 400,
                  color: isDark ? "var(--paper)" : "var(--ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                {chapter.title}
              </h2>
            </ScrollReveal>

            {/* Hindi title */}
            {chapter.titleHindi && (
              <ScrollReveal delay={250}>
                <p
                  className="font-hindi mb-6"
                  style={{
                    fontSize: "clamp(0.9rem, 1.5vw, 1.1rem)",
                    color: isDark
                      ? "rgba(243,235,221,0.6)"
                      : "var(--dhundh)",
                  }}
                >
                  {chapter.titleHindi}
                </p>
              </ScrollReveal>
            )}

            {/* Tag pills */}
            <ScrollReveal delay={300}>
              <div className="flex flex-wrap gap-2 mb-6">
                {chapter.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-body px-2.5 py-0.5 rounded-full"
                    style={{
                      fontSize: "0.6rem",
                      letterSpacing: "0.06em",
                      border: `1px solid ${
                        isDark
                          ? "rgba(243,235,221,0.15)"
                          : "rgba(31,26,23,0.12)"
                      }`,
                      color: isDark ? "rgba(243,235,221,0.6)" : "var(--dhundh)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </ScrollReveal>

            {/* Body text */}
            <ScrollReveal delay={350}>
              <p
                className="font-body leading-relaxed max-w-lg"
                style={{
                  fontSize: "clamp(0.875rem, 1.1vw, 1rem)",
                  color: isDark ? "rgba(243,235,221,0.85)" : "var(--ink)",
                  lineHeight: 1.75,
                }}
              >
                {chapter.text}
              </p>
            </ScrollReveal>

            {/* Pull quote */}
            {chapter.pullQuote && (
              <ScrollReveal delay={400}>
                <blockquote
                  className="mt-8 border-l-2 pl-5"
                  style={{
                    borderColor: isDark
                      ? "rgba(243,235,221,0.2)"
                      : "rgba(31,26,23,0.15)",
                  }}
                >
                  <p
                    className="font-display italic"
                    style={{
                      fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
                      lineHeight: 1.6,
                      color: isDark
                        ? "rgba(243,235,221,0.7)"
                        : "var(--dhundh)",
                    }}
                  >
                    &ldquo;{chapter.pullQuote}&rdquo;
                  </p>
                </blockquote>
              </ScrollReveal>
            )}
          </div>

          {/* Image column */}
          {chapter.image && (
            <div className={imgOnRight ? "" : "md:order-1"}>
              <ScrollReveal delay={200}>
                <div className="relative overflow-hidden photo-print photo-hairline">
                  <div
                    className="relative"
                    style={{
                      aspectRatio: chapter.imagePosition === "left" ? "3/4" : "4/3",
                    }}
                  >
                    <Image
                      src={chapter.image}
                      alt={chapter.imageAlt || chapter.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </div>
                {chapter.imageCaption && (
                  <p
                    className="font-body mt-3"
                    style={{
                      fontSize: "0.6rem",
                      letterSpacing: "0.05em",
                      color: isDark
                        ? "rgba(243,235,221,0.4)"
                        : "var(--dhundh)",
                      fontVariant: "small-caps",
                    }}
                  >
                    {chapter.imageCaption}
                  </p>
                )}
              </ScrollReveal>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
