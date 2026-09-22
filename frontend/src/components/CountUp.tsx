"use client";

import React, { useEffect, useRef, useState } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  separator?: string;
  className?: string;
  formattedValue?: string;
}

function formatNumber(n: number, separator = ","): string {
  return n.toLocaleString("en-IN").replace(/,/g, separator);
}

export default function CountUp({
  end,
  duration = 2000,
  separator = ",",
  className = "",
  formattedValue,
}: CountUpProps) {
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setCurrent(end);
      return;
    }

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min(
        (timestamp - startTimestamp) / duration,
        1
      );
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(eased * end));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [started, end, duration]);

  const display = formattedValue || formatNumber(current, separator);

  return (
    <span ref={ref} className={className} aria-label={formatNumber(end, ",")}>
      {display}
    </span>
  );
}
