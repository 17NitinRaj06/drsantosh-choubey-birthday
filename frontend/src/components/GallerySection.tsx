"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import ScrollReveal from "./ScrollReveal";
import { galleryImages } from "@/lib/content";

export default function GallerySection() {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const openLightbox = useCallback((idx: number) => {
    setLightbox(idx);
    document.body.style.overflow = "hidden";
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox(null);
    document.body.style.overflow = "";
  }, []);

  const goNext = useCallback(() => {
    setLightbox((prev) =>
      prev === null ? null : (prev + 1) % galleryImages.length
    );
  }, []);

  const goPrev = useCallback(() => {
    setLightbox((prev) =>
      prev === null
        ? null
        : (prev - 1 + galleryImages.length) % galleryImages.length
    );
  }, []);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox, goNext, goPrev]);

  return (
    <section className="chapter-paper py-16 md:py-24 px-6 md:px-12" aria-label="Gallery">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="mb-12 md:mb-16">
            <p
              className="font-body uppercase tracking-[0.2em] mb-3"
              style={{ fontSize: "0.6rem", color: "var(--dhundh)" }}
            >
              इंजनियाँ
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
              Moments in Time
            </h2>
          </div>
        </ScrollReveal>

        {/* Editorial grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {galleryImages.map((img, idx) => {
            const spanClass =
              idx === 0 || idx === 3
                ? "col-span-2 md:col-span-2"
                : "col-span-1";

            return (
              <ScrollReveal key={img.id} delay={idx * 50}>
                <button
                  className={`relative w-full overflow-hidden group ${spanClass} photo-print photo-hairline`}
                  style={{
                    aspectRatio: idx === 0 || idx === 3 ? "16/9" : "1/1",
                    cursor: "pointer",
                  }}
                  onClick={() => openLightbox(idx)}
                  aria-label={`View: ${img.alt}`}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes={
                      idx === 0 || idx === 3
                        ? "(max-width: 768px) 100vw, 66vw"
                        : "(max-width: 768px) 50vw, 33vw"
                    }
                  />
                </button>
              </ScrollReveal>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: "rgba(31,26,23,0.95)" }}
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center"
            onClick={closeLightbox}
            aria-label="Close"
            style={{ color: "var(--paper)" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4 L16 16 M16 4 L4 16" />
            </svg>
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            aria-label="Previous"
            style={{ color: "var(--paper)" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13 4 L7 10 L13 16" />
            </svg>
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            aria-label="Next"
            style={{ color: "var(--paper)" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 4 L13 10 L7 16" />
            </svg>
          </button>
          <div
            className="relative w-full h-full max-w-4xl max-h-[80vh] mx-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={galleryImages[lightbox].src}
              alt={galleryImages[lightbox].alt}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>
          {galleryImages[lightbox].caption && (
            <div className="absolute bottom-6 left-0 right-0 text-center">
              <p
                className="font-body"
                style={{
                  fontSize: "0.7rem",
                  color: "rgba(243,235,221,0.5)",
                  fontVariant: "small-caps",
                  letterSpacing: "0.06em",
                }}
              >
                {galleryImages[lightbox].caption}
              </p>
            </div>
          )}
          <div
            className="absolute top-4 left-4 font-body"
            style={{ fontSize: "0.6rem", color: "rgba(243,235,221,0.4)" }}
          >
            {lightbox + 1} / {galleryImages.length}
          </div>
        </div>
      )}
    </section>
  );
}
