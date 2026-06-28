"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import ScaleReveal from "@/components/reveal-animations/ScaleReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";

/**
 * The branded title card shown before a demo: the church's logo big + a one-line
 * explainer, using the same reveal motion as the dashboards. It lives inside
 * DemoChrome, so `bg-paper` / `bg-brand` resolve to the church's chosen palette
 * (and light/dark mode) automatically.
 *
 * Auto-advances after a beat (calls `onDone`), then the overlay fades to reveal
 * the demo underneath. When `persist`, it drops a long-lived cookie so the
 * server skips it on every later visit (zero flash) — the server decides whether
 * to render this at all. Respects reduced-motion (static + quick).
 */
export default function DemoIntro({
  churchName,
  logoUrl,
  cookieName,
  persist = true,
  onDone,
}: {
  churchName: string;
  logoUrl?: string;
  cookieName: string;
  /** Drop the "seen" cookie so it never shows again. Off while previewing. */
  persist?: boolean;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (persist) {
      try {
        // One year; the server reads this on the next visit and skips the intro.
        document.cookie = `${cookieName}=1; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // cookies unavailable — harmless; it'll just play again next time.
      }
    }
    const t = setTimeout(onDone, reduce ? 1400 : 4400);
    return () => clearTimeout(t);
  }, [onDone, reduce, cookieName, persist]);

  const logo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={churchName}
      className="mx-auto h-[84px] w-auto max-w-[280px] object-contain [filter:var(--logo-filter)] sm:h-[104px]"
    />
  ) : (
    <div className="mx-auto flex h-[88px] w-[88px] items-center justify-center rounded-[22px] bg-brand font-serif text-[44px] font-semibold text-on-accent sm:h-[104px] sm:w-[104px]">
      {churchName.charAt(0)}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-paper px-6 text-ink"
    >
      {/* Subtle brand wash — matches the chosen palette accent. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_38%,_rgb(var(--brand)_/_0.10),_transparent_70%)]" />

      <div className="relative w-full max-w-[520px] text-center">
        {reduce ? (
          <>
            {logo}
            <div className="mt-7 text-[11.5px] font-semibold uppercase tracking-[2.6px] text-brand">
              Live demo
            </div>
            <h1 className="mt-3 font-serif text-[34px] font-medium leading-[1.08] sm:text-[40px]">
              Built for {churchName}
            </h1>
            <p className="mx-auto mt-4 max-w-[34em] text-[16px] leading-[1.6] text-ink-soft">
              A member profile page experience with personalized next steps.
            </p>
          </>
        ) : (
          <>
            <ScaleReveal immediate delay={0.1}>
              {logo}
            </ScaleReveal>
            <SubheadingReveal
              immediate
              delay={0.45}
              className="mt-7 text-[11.5px] font-semibold uppercase tracking-[2.6px] text-brand"
            >
              Live demo
            </SubheadingReveal>
            <HeadingReveal
              immediate
              as="h1"
              delay={0.6}
              className="mt-3 font-serif text-[34px] font-medium leading-[1.08] sm:text-[40px]"
            >
              {`Built for ${churchName}`}
            </HeadingReveal>
            <ParagraphReveal
              immediate
              delay={0.95}
              className="mx-auto mt-4 max-w-[34em] text-[16px] leading-[1.6] text-ink-soft"
            >
              A member experience with personalized next steps.
            </ParagraphReveal>
            {/* Auto-advance cue — fills left→right over the hold. */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 3.6, ease: "linear", delay: 0.7 }}
              style={{ transformOrigin: "left" }}
              className="mx-auto mt-9 h-[3px] w-[120px] rounded-full bg-brand/70"
            />
          </>
        )}
      </div>
    </motion.div>
  );
}
