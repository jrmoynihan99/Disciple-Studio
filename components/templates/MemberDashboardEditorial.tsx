"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import type { ChurchConfig } from "@/lib/types";
import { getMemberProgress, type StepItem } from "@/lib/steps";
import { useClickOutside } from "@/lib/useClickOutside";
import { EASE, SPRING, SPRING_SOFT, CROSSFADE, swapUp } from "@/lib/motion";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import ScaleReveal from "@/components/reveal-animations/ScaleReveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import CountUpCurrency from "@/components/CountUpCurrency";
import { useDemoCTA } from "@/context/DemoCTAContext";

/**
 * Editorial member dashboard — React/Tailwind port of `dashboard-editorial`.
 * Greeting + journey progress, an interactive pathway (click a step to slide the
 * focus highlight and preview it in the focal card), plus hardcoded group +
 * giving cards.
 *
 * Sections reveal on load via the reveal-animations; clicking a pathway step
 * glides a shared-element highlight between steps and crossfades the focal card.
 *
 * Self-chromed (own header + dropdown). All colors come from the semantic
 * palette tokens injected by DemoChrome (bg-paper, text-ink, bg-brand, …), so
 * it adapts to light/dark automatically. Serif = the configured `font-serif`.
 */

// Group, giving, sermon notes + prayer are sample content, hardcoded (not configurable).
const GROUP = {
  name: "Eastside Tuesday Group",
  host: "Marcus & Renee Hill",
  location: "Riverside Ave, Eastside",
  nextMeeting: "Tue, Jul 1 · 7:00 PM",
};
const GIVING = {
  year: "2026",
  amount: 1240,
  gifts: 14,
  gratitude:
    "Thank you — every gift this year went straight into people far from God finding their way home.",
};
const SERMON = {
  latestNote: "Grace didn't wait at the door — it ran down the road to meet him.",
};
const PRAYERS = [
  { text: "Healing for my dad's recovery", praying: 14 },
  { text: "Wisdom about a big decision", praying: 6 },
];

function statusTag(s: StepItem): string {
  if (s.completed) return "COMPLETED";
  if (s.inProgress) return "YOU'RE HERE";
  return "COMING UP";
}

// useLayoutEffect on the client, useEffect on the server (dodges the SSR warning).
const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function MemberDashboardEditorial({ config }: { config: ChurchConfig }) {
  const { demoMember } = config;
  const firstName = demoMember.firstName;
  const openCTA = useDemoCTA();

  const { discipleshipSteps, nextSteps } = getMemberProgress(config);
  const lists = [{ label: "Your discipleship pathway", steps: discipleshipSteps }];
  if (nextSteps.length) lists.push({ label: "Your next steps", steps: nextSteps });

  const pathway = lists[0];
  // The journey stat spans BOTH lists, not just the discipleship pathway.
  const allSteps = lists.flatMap((l) => l.steps);
  const total = allSteps.length;
  const doneCount = allSteps.filter((s) => s.completed).length;

  let defIdx = pathway.steps.findIndex((s) => s.inProgress);
  if (defIdx < 0) defIdx = pathway.steps.findIndex((s) => !s.completed);
  if (defIdx < 0) defIdx = 0;

  const [selKey, setSelKey] = useState(`0-${defIdx}`);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, menuOpen, () => setMenuOpen(false));
  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => {
    const h = new Date().getHours();
    const word = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    setGreeting(`${word} · ${date}`);
  }, []);

  // ── Desktop only: slide the focal card so its center lines up with the
  // selected step, clamped so it never spills past the top/bottom of the list.
  const cardColRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [cardTop, setCardTop] = useState(0);
  const [positioned, setPositioned] = useState(false);

  const recomputeRef = useRef<() => void>(() => {});
  recomputeRef.current = () => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      setCardTop(0);
      return;
    }
    const col = cardColRef.current;
    const card = cardRef.current;
    const row = rowRefs.current.get(selKey);
    if (!col || !card || !row) return;
    const colTop = col.getBoundingClientRect().top;
    const rowRect = row.getBoundingClientRect();
    const cardH = card.offsetHeight;
    const colH = col.offsetHeight;
    const stepCenter = rowRect.top - colTop + rowRect.height / 2;
    const next = Math.max(0, Math.min(Math.max(0, colH - cardH), stepCenter - cardH / 2));
    setCardTop((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
  };

  useIsoLayout(() => {
    recomputeRef.current();
  }, [selKey]);

  useEffect(() => {
    const fn = () => recomputeRef.current();
    window.addEventListener("resize", fn);
    const ro = new ResizeObserver(fn);
    if (cardRef.current) ro.observe(cardRef.current);
    if (cardColRef.current) ro.observe(cardColRef.current);
    // Re-center once the load reveals settle (their transforms move the rows).
    const t1 = setTimeout(fn, 250);
    const t2 = setTimeout(fn, 1300);
    // Enable smooth transitions only after the first (instant) positioning.
    const raf = requestAnimationFrame(() => setPositioned(true));
    return () => {
      window.removeEventListener("resize", fn);
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      cancelAnimationFrame(raf);
    };
  }, []);

  let selected: StepItem | null = null;
  lists.forEach((list, li) =>
    list.steps.forEach((s, si) => {
      if (`${li}-${si}` === selKey) selected = s;
    }),
  );
  if (!selected) selected = pathway.steps[defIdx] ?? pathway.steps[0] ?? null;
  const sel: StepItem | null = selected;
  const current = pathway.steps.find((s) => s.inProgress) ?? pathway.steps.find((s) => !s.completed);

  return (
    <div className="relative min-h-screen bg-paper px-4 pt-6 pb-14 text-ink sm:px-6 lg:px-10 lg:pt-[34px] lg:pb-20">
      {/* Ambient glows (decorative) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[14%] h-[46vw] w-[46vw] rounded-full bg-[radial-gradient(circle,_rgb(var(--brand)_/_0.11),_transparent_67%)] blur-[40px] animate-[edDrift1_26s_ease-in-out_infinite]" />
        <div className="absolute -bottom-[16%] -right-[12%] h-[52vw] w-[52vw] rounded-full bg-[radial-gradient(circle,_rgb(var(--brand)_/_0.08),_transparent_70%)] blur-[48px] animate-[edDrift2_33s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-[1] mx-auto max-w-[1180px]">
        {/* ── HEADER ── */}
        <SectionReveal className="relative z-50">
          <Reveal>
            <header className="flex items-center justify-between gap-3 border-b border-hairline pb-[22px]">
              <div className="flex min-w-0 items-center gap-[13px]">
                {config.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.logoUrl}
                    alt=""
                    className="h-[50px] w-auto max-w-[200px] flex-none object-contain [filter:var(--logo-filter)]"
                  />
                ) : (
                  <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-brand font-serif text-[21px] font-semibold text-on-accent">
                    {config.churchName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 leading-[1.1]">
                  <div className="truncate font-serif text-[18px] font-semibold tracking-[.1px]">{config.churchName}</div>
                  {config.tagline ? (
                    <div className="mt-1 max-w-[260px] truncate text-[11.5px] text-ink-muted">{config.tagline}</div>
                  ) : (
                    <div className="mt-0.5 text-[10.5px] font-semibold tracking-[2.4px] text-faint">MEMBER PORTAL</div>
                  )}
                </div>
              </div>

              <div ref={menuRef} className="relative shrink-0">
                <motion.button
                  onClick={() => setMenuOpen((o) => !o)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING_SOFT}
                  className="flex cursor-pointer items-center gap-[11px] rounded-xl border-0 bg-transparent p-1"
                >
                  <div className="text-right leading-[1.15]">
                    <div className="text-[13px] font-semibold text-ink">{firstName}</div>
                  </div>
                  <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-edge bg-card-2 text-[14px] font-semibold text-ink-soft">
                    {firstName.charAt(0)}
                  </div>
                  <motion.span
                    animate={{ rotate: menuOpen ? 180 : 0 }}
                    transition={SPRING_SOFT}
                    className="inline-block translate-y-px text-[11px] text-faint"
                  >
                    ▾
                  </motion.span>
                </motion.button>

                <AnimatePresence>
                  {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: EASE }}
                        className="absolute right-0 top-[calc(100%+12px)] z-50 w-80 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-[18px] border border-hairline bg-card shadow-[0_34px_70px_-28px_rgba(20,12,10,0.34)]"
                      >
                        <div className="bg-card-2 px-5 pb-[15px] pt-[18px]">
                          <div className="text-[10px] font-extrabold tracking-[2.4px] text-brand">YOUR NEXT STEP</div>
                          <div className="mt-[5px] font-serif text-[23px] leading-[1.12]">{current?.label ?? ""}</div>
                        </div>
                        <div className="h-px bg-hairline-soft" />
                        <div className="px-5 pb-[6px] pt-[14px]">
                          {lists.map((list) => {
                            const ld = list.steps.filter((s) => s.completed).length;
                            return (
                              <div key={list.label} className="mb-[14px]">
                                <div className="text-[10px] font-bold uppercase tracking-[2px] text-faint">
                                  {list.label} · {ld}/{list.steps.length}
                                </div>
                                <div className="mt-[11px] flex flex-col gap-[9px]">
                                  {list.steps.map((s) => (
                                    <div key={s.key} className="flex items-center gap-[9px]">
                                      {s.completed ? (
                                        <div className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-brand">
                                          <span className="text-[9px] leading-none text-on-accent">✓</span>
                                        </div>
                                      ) : s.inProgress ? (
                                        <div className="h-[18px] w-[18px] flex-none rounded-full border-2 border-brand bg-card" />
                                      ) : (
                                        <div className="h-[18px] w-[18px] flex-none rounded-full border-2 border-upcoming bg-card" />
                                      )}
                                      <div
                                        className={`text-[13.5px] ${s.inProgress ? "font-bold" : "font-medium"} ${
                                          s.completed || s.inProgress ? "text-ink-soft" : "text-faint"
                                        }`}
                                      >
                                        {s.label}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="h-px bg-hairline-soft" />
                        <div className="px-[18px] py-[14px]">
                          <motion.button
                            onClick={() => setMenuOpen(false)}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            transition={SPRING_SOFT}
                            className="w-full cursor-pointer rounded-[11px] border-0 bg-ink py-3 text-[13.5px] font-bold text-paper"
                          >
                            View profile
                          </motion.button>
                        </div>
                      </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </header>
          </Reveal>
        </SectionReveal>

        {/* ── GREETING ── */}
        <SectionReveal>
          <section className="mt-10 flex flex-wrap items-end justify-between gap-6 lg:mt-[46px] lg:gap-10">
            <div className="max-w-[640px]">
              <SubheadingReveal
                delay={0.4}
                className="min-h-[14px] text-[11.5px] font-semibold uppercase tracking-[2.6px] text-brand"
              >
                {greeting ?? " "}
              </SubheadingReveal>
              <h1 className="mt-[14px] font-serif text-[40px] font-medium leading-[1.04] tracking-[-.6px] sm:text-[48px] lg:text-[58px] lg:leading-[1.02]">
                <HeadingReveal as="span" className="block">
                  Welcome back,
                </HeadingReveal>
                <HeadingReveal as="span" delay={0.18} className="block italic text-brand">
                  {`${firstName}.`}
                </HeadingReveal>
              </h1>
              {config.welcomeLine && (
                <ParagraphReveal
                  delay={0.5}
                  className="mt-[18px] max-w-[480px] text-[17px] leading-[1.5] text-ink-soft"
                >
                  {config.welcomeLine}
                </ParagraphReveal>
              )}
            </div>
            <Reveal delay={0.12} className="pb-[6px] text-right leading-[1.1]">
              <div className="text-[11px] font-semibold tracking-[2px] text-faint">YOUR JOURNEY</div>
              <div className="mt-[6px] font-serif text-[34px] font-semibold">
                {doneCount}/{total}
              </div>
              <div className="mt-0.5 text-[12.5px] text-ink-muted">steps complete</div>
            </Reveal>
          </section>
        </SectionReveal>

        {/* ── LISTS + FOCAL CARD ── */}
        <SectionReveal>
          <section className="mt-10 grid grid-cols-1 items-start gap-8 lg:mt-[44px] lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
            <div className="min-w-0">
              <LayoutGroup>
              {lists.map((list, li) => (
                <div key={list.label} className="mb-[30px]">
                  <Reveal>
                    <div className="mb-[22px] text-[11.5px] font-semibold uppercase tracking-[2.4px] text-faint">
                      {list.label}
                    </div>
                  </Reveal>
                  <div className="flex flex-col">
                    {list.steps.map((s, si) => {
                      const key = `${li}-${si}`;
                      const isSelected = key === selKey;
                      const notLast = si < list.steps.length - 1;
                      return (
                        <Reveal key={s.key} delay={0.1 + si * 0.08}>
                          <div
                            ref={(el) => {
                              if (el) rowRefs.current.set(key, el);
                              else rowRefs.current.delete(key);
                            }}
                            onClick={() => setSelKey(key)}
                            className="flex cursor-pointer items-stretch gap-[18px]"
                          >
                            <div className="flex w-[34px] flex-none flex-col items-center">
                              {s.completed ? (
                                <motion.div
                                  whileHover={{ scale: 1.08 }}
                                  transition={SPRING_SOFT}
                                  className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-brand ${
                                    isSelected
                                      ? "shadow-[0_0_0_4px_rgb(var(--brand)_/_0.18)]"
                                      : "shadow-[0_2px_8px_rgb(var(--brand)_/_0.25)]"
                                  }`}
                                >
                                  <span className="text-[15px] leading-none text-on-accent">✓</span>
                                </motion.div>
                              ) : s.inProgress ? (
                                <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border-[2.5px] border-brand bg-card animate-[edPulse_2.6s_ease-in-out_infinite]">
                                  <div className="h-[11px] w-[11px] rounded-full bg-brand" />
                                </div>
                              ) : (
                                <motion.div
                                  whileHover={{ scale: 1.08 }}
                                  transition={SPRING_SOFT}
                                  className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border-2 bg-transparent transition-colors ${
                                    isSelected ? "border-brand" : "border-upcoming"
                                  }`}
                                >
                                  <span className="font-serif text-[12px] font-semibold text-faint">
                                    {String(si + 1).padStart(2, "0")}
                                  </span>
                                </motion.div>
                              )}
                              {notLast && (
                                <div className={`mt-[5px] min-h-[30px] w-0.5 flex-1 ${s.completed ? "bg-brand" : "bg-upcoming"}`} />
                              )}
                            </div>

                            <div className="flex-1 pb-[20px]">
                              <div className="relative">
                                {isSelected && (
                                  <>
                                    {/* Desktop: shared highlight that slides between rows. The inline
                                        expansion is lg:hidden, so here it only ever wraps the label —
                                        a stable size, so no layout flicker. */}
                                    <motion.div
                                      layoutId="ed-step-highlight"
                                      transition={SPRING}
                                      className="absolute inset-0 hidden rounded-[15px] border border-brand/25 bg-brand/10 shadow-[0_10px_26px_-16px_rgb(var(--brand)_/_0.5)] lg:block"
                                    />
                                    {/* Mobile: a plain highlight that grows with the inline expansion
                                        via CSS — no layout animation, so no grow-then-shrink flicker. */}
                                    <div className="absolute inset-0 rounded-[15px] border border-brand/25 bg-brand/10 lg:hidden" />
                                  </>
                                )}
                                <motion.div
                                  whileHover={isSelected ? undefined : { x: 3 }}
                                  transition={SPRING_SOFT}
                                  className={`relative rounded-[15px] px-[16px] py-[13px] ${
                                    isSelected ? "" : "transition-colors hover:bg-ink/[0.02]"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div
                                      className={`text-[10.5px] font-bold tracking-[2.2px] transition-colors ${
                                        isSelected ? "text-brand" : "text-faint"
                                      }`}
                                    >
                                      {statusTag(s)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <motion.div
                                        animate={{ opacity: isSelected ? 1 : 0 }}
                                        transition={CROSSFADE}
                                        className="hidden text-[10.5px] tracking-[.4px] text-brand/70 lg:block"
                                      >
                                        shown →
                                      </motion.div>
                                      <motion.span
                                        animate={{ rotate: isSelected ? 180 : 0 }}
                                        transition={SPRING_SOFT}
                                        className={`text-[12px] leading-none lg:hidden ${isSelected ? "text-brand" : "text-faint"}`}
                                      >
                                        ▾
                                      </motion.span>
                                    </div>
                                  </div>
                                  <div
                                    className={`mt-[5px] font-serif leading-[1.18] transition-all duration-300 ${
                                      isSelected
                                        ? "text-[22px] font-semibold text-ink"
                                        : `text-[21px] font-medium ${
                                            !s.completed && !s.inProgress ? "text-faint" : "text-ink"
                                          }`
                                    }`}
                                  >
                                    {s.label}
                                  </div>

                                  {/* Mobile: the card content expands inside this item — the
                                      highlight box grows to wrap it (no separate side card). */}
                                  <AnimatePresence initial={false}>
                                    {isSelected && (
                                      <motion.div
                                        key="expand"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: EASE }}
                                        className="overflow-hidden lg:hidden"
                                      >
                                        <div className="pt-3">
                                          {s.description && (
                                            <p className="text-[14px] leading-[1.55] text-ink-soft">{s.description}</p>
                                          )}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openCTA(s.label);
                                            }}
                                            className="mt-3.5 w-full cursor-pointer rounded-[12px] bg-brand py-3 text-[14px] font-bold text-on-accent"
                                          >
                                            {(s.ctaLabel ?? "Open")} →
                                          </button>
                                          {s.meta && (
                                            <div className="mt-2.5 text-center text-[12px] text-ink-muted">{s.meta}</div>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </motion.div>
                              </div>
                            </div>
                          </div>
                        </Reveal>
                      );
                    })}
                  </div>
                </div>
              ))}
              </LayoutGroup>
            </div>

            {/* Focal card — desktop only; on mobile the step content expands inline */}
            <div ref={cardColRef} className="hidden lg:relative lg:block lg:self-stretch">
              {sel && (
                <div
                  ref={cardRef}
                  style={{ top: cardTop }}
                  className={`lg:absolute lg:inset-x-0 ${
                    positioned
                      ? "lg:transition-[top] lg:duration-500 lg:ease-[cubic-bezier(0.08,0.82,0.17,1)]"
                      : ""
                  }`}
                >
                  <ScaleReveal delay={0.08}>
                  <motion.div
                    layout
                    transition={SPRING}
                    className="relative overflow-hidden rounded-[22px] bg-brand-card px-6 py-7 text-on-accent shadow-[0_24px_60px_-22px_rgb(var(--brand-card)_/_0.6)] sm:px-8 lg:py-[34px]"
                  >
                    <div className="pointer-events-none absolute -right-[40px] -top-[60px] h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,_rgba(255,210,190,0.18),_transparent_70%)]" />
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.div
                        key={sel.key}
                        variants={swapUp}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={CROSSFADE}
                      >
                        <div className="text-[11px] font-bold tracking-[2.6px] text-on-accent/70">
                          {sel.completed ? "COMPLETED ✓" : sel.inProgress ? "YOUR NEXT STEP" : "COMING UP"}
                        </div>
                        <h2 className="mt-[14px] font-serif text-[36px] font-medium leading-[1.08] tracking-[-.3px]">
                          {sel.label}
                        </h2>
                        {sel.description && (
                          <p className="mt-4 text-[15px] leading-[1.55] text-on-accent/80">{sel.description}</p>
                        )}
                        <motion.button
                          onClick={() => openCTA(sel?.label)}
                          whileHover={{ y: -2, boxShadow: "0 14px 28px -8px rgba(0,0,0,0.4)" }}
                          whileTap={{ scale: 0.98 }}
                          transition={SPRING_SOFT}
                          className="mt-[26px] w-full cursor-pointer rounded-[13px] border-0 bg-accent-btn py-4 text-[15px] font-bold tracking-[.1px] text-accent-btn-ink"
                        >
                          {(sel.ctaLabel ?? "Open")} →
                        </motion.button>
                        {sel.meta && <div className="mt-[14px] text-center text-[12px] text-on-accent/60">{sel.meta}</div>}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                  </ScaleReveal>
                </div>
              )}
            </div>
          </section>
        </SectionReveal>

        {/* ── GROUP + GIVING (hardcoded) ── */}
        <SectionReveal>
          <section className="mt-6 grid grid-cols-1 items-stretch gap-6 md:grid-cols-[1.05fr_.95fr] lg:mt-[34px] lg:gap-10">
            <Reveal className="h-full">
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="h-full rounded-[20px] border border-edge bg-card px-7 py-[26px]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold tracking-[2.2px] text-faint">YOUR COMMUNITY GROUP</div>
                  <div className="text-[11.5px] font-semibold text-brand">Active</div>
                </div>
                <div className="mt-3 font-serif text-[25px] font-semibold leading-[1.15]">{GROUP.name}</div>
                <div className="mt-5 flex items-center gap-3 border-t border-hairline-soft pt-[18px]">
                  <div className="h-[46px] w-[46px] flex-none rounded-full border border-edge bg-[repeating-linear-gradient(45deg,_var(--card-2),_var(--card-2)_6px,_var(--edge)_6px,_var(--edge)_12px)]" />
                  <div className="leading-[1.3]">
                    <div className="text-[11px] tracking-[.4px] text-faint">HOSTED BY</div>
                    <div className="text-[15px] font-semibold">{GROUP.host}</div>
                    <div className="text-[12.5px] text-ink-muted">{GROUP.location}</div>
                  </div>
                </div>
                <div className="mt-[18px] flex items-center justify-between rounded-xl bg-card-2 px-[15px] py-[13px]">
                  <div>
                    <div className="text-[10.5px] font-semibold tracking-[1.6px] text-faint">NEXT MEETING</div>
                    <div className="mt-0.5 text-[14.5px] font-semibold">{GROUP.nextMeeting}</div>
                  </div>
                  <button
                    onClick={() => openCTA("Group Details")}
                    className="cursor-pointer text-[13px] font-semibold text-brand transition-transform hover:translate-x-0.5"
                  >
                    Details →
                  </button>
                </div>
              </motion.div>
            </Reveal>

            <Reveal delay={0.08} className="h-full">
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-col justify-between rounded-[20px] border border-edge bg-card px-7 py-[26px]"
              >
                <div>
                  <div className="text-[11px] font-bold tracking-[2.2px] text-faint">YOUR GIVING · {GIVING.year}</div>
                  <div className="mt-[14px] flex items-baseline gap-2.5">
                    <CountUpCurrency
                      value={GIVING.amount}
                      className="font-serif text-[46px] font-semibold tracking-[-1px]"
                    />
                    <div className="text-[13px] text-ink-muted">{GIVING.gifts} gifts</div>
                  </div>
                </div>
                <p className="mt-5 font-serif text-[14.5px] italic leading-[1.5] text-ink-soft">{GIVING.gratitude}</p>
                <div className="mt-[18px] flex gap-2.5">
                  <motion.button
                    onClick={() => openCTA("Giving")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_SOFT}
                    className="flex-1 cursor-pointer rounded-xl border-0 bg-ink py-[13px] text-[14px] font-semibold text-paper"
                  >
                    Give again
                  </motion.button>
                  <motion.button
                    onClick={() => openCTA("Giving")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_SOFT}
                    className="flex-none cursor-pointer rounded-xl border border-edge bg-transparent px-[18px] py-[13px] text-[14px] font-semibold text-ink-soft"
                  >
                    Statement
                  </motion.button>
                </div>
              </motion.div>
            </Reveal>
          </section>
        </SectionReveal>

        {/* ── SERMON NOTES + PRAYER (hardcoded) — mirrored split: narrower left ── */}
        <SectionReveal>
          <section className="mt-6 grid grid-cols-1 items-stretch gap-6 md:grid-cols-[.95fr_1.05fr] lg:mt-10 lg:gap-10">
            {/* Sermon notes */}
            <Reveal className="h-full">
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-col rounded-[20px] border border-edge bg-card px-7 py-[26px]"
              >
                <h3 className="font-serif text-[28px] font-semibold leading-[1.1]">Sermon Notes</h3>
                <div className="mt-4 rounded-xl bg-card-2 px-[18px] py-4">
                  <div className="text-[10.5px] font-bold tracking-[1.8px] text-faint">YOUR LATEST NOTE</div>
                  <p className="mt-2 font-serif text-[15px] italic leading-[1.5] text-ink-soft">{SERMON.latestNote}</p>
                </div>
                <motion.button
                  onClick={() => openCTA("Sermon Notes")}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING_SOFT}
                  className="mt-auto w-full cursor-pointer rounded-xl border-0 bg-ink py-[13px] text-[14px] font-semibold text-paper"
                >
                  View all notes
                </motion.button>
              </motion.div>
            </Reveal>

            {/* Prayer requests */}
            <Reveal delay={0.08} className="h-full">
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-col rounded-[20px] border border-edge bg-card px-7 py-[26px]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold tracking-[2.2px] text-faint">YOUR PRAYER REQUESTS</div>
                  <div className="text-[11.5px] font-semibold text-brand">{PRAYERS.length} active</div>
                </div>
                <div className="mt-4 flex flex-col">
                  {PRAYERS.map((p) => (
                    <div
                      key={p.text}
                      className="flex items-center justify-between gap-3 border-t border-hairline-soft py-3 first:border-t-0 first:pt-0"
                    >
                      <div className="text-[14.5px] leading-[1.3] text-ink">{p.text}</div>
                      <div className="flex flex-none items-center gap-1.5 text-[12px] text-ink-muted">
                        <span className="text-brand">♥</span> {p.praying} praying
                      </div>
                    </div>
                  ))}
                </div>
                <motion.button
                  onClick={() => openCTA("Prayer Requests")}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING_SOFT}
                  className="mt-auto cursor-pointer rounded-xl border border-edge bg-transparent py-[13px] text-[14px] font-semibold text-ink-soft"
                >
                  Share a request
                </motion.button>
              </motion.div>
            </Reveal>
          </section>
        </SectionReveal>
      </div>
    </div>
  );
}
