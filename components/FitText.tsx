"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Renders its text on a SINGLE line, shrinking the font size until it fits the
 * available width — no matter how long the text. Used for focal card titles
 * (e.g. "Attend a Worship Service") that must never wrap and push the layout.
 *
 * `max` is the ideal font size in px (used when the text already fits); the font
 * only shrinks from there, down to `min`. Recomputes on container resize, on text
 * change, and once web fonts finish loading (their metrics change the width).
 */
export default function FitText({
  children,
  max,
  min = 14,
  className = "",
}: {
  children: React.ReactNode;
  max: number;
  min?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      el.style.fontSize = `${max}px`; // measure at the ideal size (also lets it grow back)
      const avail = el.clientWidth; // parent-constrained; unaffected by our font-size change
      const natural = el.scrollWidth; // full single-line text width at `max`
      if (avail > 0 && natural > avail) {
        el.style.fontSize = `${Math.max(min, Math.floor((max * avail) / natural) * 0.99)}px`;
      }
    };

    fit();

    // Re-fit only on real WIDTH changes — font-size changes alter height (which
    // would otherwise loop the observer), so we ignore those.
    let lastW = el.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (Math.abs(w - lastW) < 0.5) return;
      lastW = w;
      fit();
    });
    ro.observe(el);

    // Web fonts load after first paint and change text metrics.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [children, max, min]);

  return (
    <span ref={ref} className={className} style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden" }}>
      {children}
    </span>
  );
}
