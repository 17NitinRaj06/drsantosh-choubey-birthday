"use client";

import React, { useState } from "react";
import Image from "next/image";
import ScrollReveal from "./ScrollReveal";
import { institutions } from "@/lib/content";

export default function InstitutionsSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="chapter-paper py-16 md:py-24 px-6 md:px-12" aria-label="Institutions">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="mb-12 md:mb-16">
            <p
              className="font-body uppercase tracking-[0.2em] mb-3"
              style={{ fontSize: "0.6rem", color: "var(--dhundh)" }}
            >
              संस्थाएँ
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
              An Ecosystem of Learning
            </h2>
          </div>
        </ScrollReveal>

        {/* Desktop list */}
        <div className="hidden md:block">
          {institutions.map((inst, idx) => (
            <ScrollReveal key={inst.id} delay={idx * 60}>
              <div>
                <button
                  className="w-full flex items-baseline justify-between py-5 text-left cursor-default group"
                  style={{ borderBottom: "1px solid rgba(31,26,23,0.08)" }}
                  onClick={() => setOpenId(openId === inst.id ? null : inst.id)}
                >
                  <div>
                    <h3
                      className="font-display"
                      style={{
                        fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)",
                        fontWeight: 400,
                        color: "var(--ink)",
                      }}
                    >
                      {inst.name}
                    </h3>
                    <p
                      className="font-body mt-0.5"
                      style={{ fontSize: "0.75rem", color: "var(--dhundh)" }}
                    >
                      {inst.location}
                    </p>
                  </div>
                  <span
                    className="font-body tabular-nums ml-6"
                    style={{ fontSize: "0.7rem", color: "var(--dhundh)" }}
                  >
                    {inst.year}
                  </span>
                </button>

                <div
                  className="overflow-hidden transition-all duration-500"
                  style={{
                    maxHeight: openId === inst.id ? "200px" : "0",
                    opacity: openId === inst.id ? 1 : 0,
                  }}
                >
                  <div className="flex gap-6 py-4">
                    <p
                      className="font-body flex-1"
                      style={{
                        fontSize: "0.8rem",
                        lineHeight: 1.7,
                        color: "var(--ink)",
                      }}
                    >
                      {inst.description}
                    </p>
                    {inst.image && (
                      <div
                        className="relative flex-shrink-0 w-40 h-28 overflow-hidden photo-print photo-hairline"
                      >
                        <Image
                          src={inst.image}
                          alt={inst.imageAlt || inst.name}
                          fill
                          className="object-cover"
                          sizes="160px"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Mobile accordion */}
        <div className="md:hidden">
          {institutions.map((inst) => (
            <div
              key={inst.id}
              style={{ borderBottom: "1px solid rgba(31,26,23,0.08)" }}
            >
              <button
                className="w-full flex items-center justify-between py-5 text-left"
                onClick={() => setOpenId(openId === inst.id ? null : inst.id)}
                aria-expanded={openId === inst.id}
              >
                <div>
                  <h3
                    className="font-display"
                    style={{ fontSize: "1rem", fontWeight: 400, color: "var(--ink)" }}
                  >
                    {inst.name}
                  </h3>
                  <p
                    className="font-body mt-0.5"
                    style={{ fontSize: "0.65rem", color: "var(--dhundh)" }}
                  >
                    {inst.location}
                  </p>
                </div>
                <span
                  className="font-body tabular-nums"
                  style={{ fontSize: "0.65rem", color: "var(--dhundh)" }}
                >
                  {inst.year}
                </span>
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  maxHeight: openId === inst.id ? "300px" : "0",
                  opacity: openId === inst.id ? 1 : 0,
                }}
              >
                <div className="pb-5">
                  <p
                    className="font-body mb-3"
                    style={{ fontSize: "0.8rem", lineHeight: 1.7, color: "var(--ink)" }}
                  >
                    {inst.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
