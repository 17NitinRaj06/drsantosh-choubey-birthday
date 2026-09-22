"use client";

import React from "react";
import Image from "next/image";
import ScrollReveal from "./ScrollReveal";
import { awards } from "@/lib/content";

const professional = awards.filter((a) => a.category === "professional");
const literature = awards.filter((a) => a.category === "literature");

function AwardCard({
  award,
  index,
}: {
  award: (typeof awards)[0];
  index: number;
}) {
  return (
    <ScrollReveal delay={index * 60}>
      <div
        className="py-5 flex items-start gap-4 md:gap-6"
        style={{ borderBottom: "1px solid rgba(31,26,23,0.08)" }}
      >
        <span
          className="font-display leading-none flex-shrink-0"
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
            color: "rgba(31,26,23,0.12)",
            letterSpacing: "-0.03em",
            minWidth: "3.5rem",
          }}
        >
          {award.year}
        </span>
        <div className="flex-1">
          <h3
            className="font-display"
            style={{
              fontSize: "clamp(0.9rem, 1.3vw, 1.1rem)",
              fontWeight: 400,
              color: "var(--ink)",
            }}
          >
            {award.title}
          </h3>
          {award.presenter && (
            <p
              className="font-body mt-0.5"
              style={{
                fontSize: "0.65rem",
                color: "var(--dhundh)",
                fontVariant: "small-caps",
                letterSpacing: "0.05em",
              }}
            >
              {award.presenter}
            </p>
          )}
        </div>
        {award.image && (
          <div className="relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 overflow-hidden opacity-60 hover:opacity-100 transition-opacity photo-print photo-hairline">
            <Image
              src={award.image}
              alt={award.imageAlt || award.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}

export default function LiteratureAwards() {
  return (
    <section className="chapter-sage py-16 md:py-24 px-6 md:px-12" aria-label="Awards">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <div className="mb-12 md:mb-16">
            <p
              className="font-body uppercase tracking-[0.2em] mb-3"
              style={{ fontSize: "0.6rem", color: "var(--dhundh)" }}
            >
              सम्मान
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
              Awards & Recognition
            </h2>
          </div>
        </ScrollReveal>

        <div className="mb-12">
          <ScrollReveal>
            <h3
              className="font-body uppercase tracking-[0.15em] mb-4"
              style={{ fontSize: "0.6rem", color: "var(--dhundh)" }}
            >
              Professional Excellence
            </h3>
          </ScrollReveal>
          {professional.map((award, idx) => (
            <AwardCard key={award.id} award={award} index={idx} />
          ))}
        </div>

        <div>
          <ScrollReveal>
            <h3
              className="font-body uppercase tracking-[0.15em] mb-4"
              style={{ fontSize: "0.6rem", color: "var(--dhundh)" }}
            >
              Literature
            </h3>
          </ScrollReveal>
          {literature.map((award, idx) => (
            <AwardCard key={award.id} award={award} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}
