"use client";

export default function Cover() {
  return (
    <section
      className="hero-section chapter-paper relative min-h-screen flex flex-col justify-end overflow-hidden"
      data-chapter="cover"
    >
      {/* Top: Language hint area — LanguageToggle is fixed top-left */}

      {/* Background portrait — grayscale, right-aligned, bleeding to edge */}
      <div className="hero-image-wrap absolute inset-0 z-0 overflow-hidden">
        <div className="absolute right-0 top-4 w-[48%] h-[60vh] sm:w-[50%] sm:h-[65vh] md:right-4 md:top-5 md:w-[42%] md:h-full photo-print">
          <img
            src="/images/hero-portrait.webp"
            alt="Santosh Choubey"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            style={{ objectPosition: "center 0%" }}
          />
          {/* Left fade */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, var(--paper) 0%, transparent 6%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to left, var(--paper) 0%, transparent 5%)`,
            }}
          />
          {/* Top fade — reduced to keep head visible */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, var(--paper) 0%, transparent 5%)`,
            }}
          />
        </div>
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40"
          style={{
            background: `linear-gradient(to top, var(--paper), transparent 25%)`,
          }}
        />
      </div>

      {/* Content — bottom-left anchored */}
      <div className="hero-content relative z-10 px-6 md:px-12 lg:px-20 pb-16 md:pb-24 max-w-[600px]">
        {/* Small caps header */}
        <p
          className="font-body uppercase tracking-[0.25em] mb-4"
          style={{ fontSize: "0.65rem", color: "var(--dhundh)" }}
        >
          22 September 2026
        </p>

        {/* "Happy Birthday" — small caps italic */}
        <h2
          className="font-display italic mb-0"
          style={{
            fontSize: "clamp(1.2rem, 2.5vw, 1.8rem)",
            fontWeight: 400,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          Happy Birthday Honourable Chancellor
        </h2>

        {/* "Santosh Choubey" — massive italic serif, two lines */}
        <h1
          className="font-display italic leading-[0.9] tracking-tight"
          style={{
            fontSize: "clamp(3rem, 10vw, 6rem)",
            fontWeight: 400,
            color: "var(--ink)",
          }}
        >
          Dr. Santosh
          <br />
          Choubey
        </h1>

        {/* Hindi blessing */}
        <p
          className="font-hindi mt-4 mb-6"
          style={{
            fontSize: "clamp(1rem, 2vw, 1.3rem)",
            color: "var(--ink)",
            opacity: 0.7,
          }}
        >
          जन्मदिन की हार्दिक शुभकामनाएँ
        </p>

        {/* Tag pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {["Founder, AISECT Group", "Author", "Journalist", "71 Years"].map(
            (tag) => (
              <span
                key={tag}
                className="font-body px-3 py-1 rounded-full"
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.06em",
                  border: "1px solid rgba(31, 26, 23, 0.15)",
                  color: "var(--ink)",
                }}
              >
                {tag}
              </span>
            )
          )}
        </div>
      </div>
      {/* "71" — massive typographic anchor, solid ink, bottom-left */}
      <div
        className="absolute bottom-0 left-6 md:left-12 z-5 pointer-events-none select-none"
        aria-hidden="true"
      >
        <span
          className="font-display leading-none"
          style={{
            fontSize: "clamp(8rem, 22vw, 20rem)",
            fontWeight: 400,
            color: "var(--ink)",
            opacity: 0.06,
            letterSpacing: "-0.04em",
          }}
        >
          71
        </span>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex flex-col items-center gap-1.5 opacity-40">
          <div className="w-px h-6 bg-ink animate-pulse" />
        </div>
      </div>
    </section>
  );
}
