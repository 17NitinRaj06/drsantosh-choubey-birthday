"use client";

import React from "react";
import ScrollReveal from "./ScrollReveal";
import CountUp from "./CountUp";
import { impactStats } from "@/lib/content";

export default function ImpactSection() {
  return (
    <section
      className="chapter-stone relative py-16 md:py-24 lg:py-32 px-6 md:px-12"
      aria-label="Impact by numbers"
    >
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="mb-12 md:mb-16">
            <p
              className="font-body uppercase tracking-[0.2em] mb-3"
              style={{ fontSize: "0.6rem", color: "var(--dhundh)" }}
            >
              Impact
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
              Numbers That Speak
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
          {impactStats.map((stat, idx) => (
            <ScrollReveal key={stat.id} delay={idx * 80}>
              <div>
                <span
                  className="font-display block leading-none mb-2"
                  style={{
                    fontSize: "clamp(2rem, 5vw, 3.5rem)",
                    color: "var(--ink)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  <CountUp
                    end={stat.number}
                    formattedValue={stat.formattedValue}
                    duration={2000 + idx * 200}
                  />
                </span>
                <span
                  className="font-body block uppercase tracking-widest mb-0.5"
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--ink)",
                    fontVariant: "small-caps",
                    letterSpacing: "0.08em",
                  }}
                >
                  {stat.label}
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
