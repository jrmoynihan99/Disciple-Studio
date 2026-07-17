"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup, animate } from "framer-motion";
import type { ChurchConfig } from "@/lib/types";
import { getMemberProgress, type StepItem } from "@/lib/steps";
import { useClickOutside } from "@/lib/useClickOutside";
import { EASE, SPRING, SPRING_SOFT, slideDeck } from "@/lib/motion";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import ScaleReveal from "@/components/reveal-animations/ScaleReveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import CountUpCurrency from "@/components/CountUpCurrency";
import { useDemoCTA } from "@/context/DemoCTAContext";

/**
 * Warm Guide member dashboard — React/Tailwind port of `dashboard-warm-guide`.
 * A discipleship-track ladder beside a brand-colored "next step" deck you
 * advance with arrows. Hardcoded group + giving below.
 *
 * Sections reveal on load. The deck cards slide directionally as you advance;
 * the ladder and deck are linked — clicking an upcoming ladder step glides the
 * deck to it (and a shared-element highlight tracks the step you're viewing).
 *
 * Self-chromed. All colors from the semantic palette tokens injected by
 * DemoChrome (adapts to light/dark). Serif = the configured `font-serif`
 * (Spectral by default for this template).
 */

const GROUP = {
  name: "Eastside Tuesday Group",
  host: "Marcus & Renee Hill",
  nextMeeting: "Tue, Jul 1 · 7:00 PM",
};
const GIVING = {
  year: "2026",
  amount: 1240,
  gifts: 14,
  gratitude: "Thank you — every gift finds its way home.",
};
const SERMON = {
  latestNote: "Grace didn't wait at the door — it ran down the road to meet him.",
};
const PRAYERS = [
  { text: "Healing for my dad's recovery", praying: 14 },
  { text: "Wisdom about a big decision", praying: 6 },
];

const RING_R = 43;
const RING_C = 2 * Math.PI * RING_R;

/** The eyebrow tag on the deck card, by the selected step's status. */
function deckTag(s: StepItem): string {
  return s.completed ? "COMPLETED ✓" : s.inProgress ? "DO THIS NEXT" : "COMING UP";
}

function statusLabel(s: StepItem): string {
  return s.completed ? "Completed" : s.inProgress ? "You're here" : "Upcoming";
}

/** A list's default focus: the in-progress step, else the first incomplete one. */
function defaultIdxFor(items: StepItem[]): number {
  const ip = items.findIndex((s) => s.inProgress);
  if (ip >= 0) return ip;
  const fi = items.findIndex((s) => !s.completed);
  return fi >= 0 ? fi : 0;
}

export default function MemberDashboardGuideWarm({ config }: { config: ChurchConfig }) {
  const { demoMember } = config;
  const firstName = demoMember.firstName;
  const openCTA = useDemoCTA();

  const { discipleshipSteps, nextSteps } = getMemberProgress(config);
  const lists = [{ label: "Discipleship track", steps: discipleshipSteps }];
  if (nextSteps.length) lists.push({ label: "Next steps", steps: nextSteps });

  const [activeList, setActiveList] = useState(0);
  const ai = Math.min(activeList, lists.length - 1);
  const active = lists[ai];
  // Overall progress spans BOTH lists — the journey isn't done at the end of one.
  const allSteps = lists.flatMap((l) => l.steps);
  const total = allSteps.length;
  const done = allSteps.filter((s) => s.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const ringOffset = RING_C * (1 - pct / 100);
  // The active list is navigable in the card deck — completed steps included.
  const deck = active.steps;

  // The member menu's headline next-step comes from the discipleship track (lists[0]).
  const track = lists[0];
  const trackCurrent = track.steps.find((s) => s.inProgress);

  const [deckIndex, setDeckIndex] = useState(() => defaultIdxFor(discipleshipSteps));
  const [dir, setDir] = useState(1);
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

  // Count the percentage up on load (paired with the ring sweep below).
  const [shownPct, setShownPct] = useState(0);
  useEffect(() => {
    const controls = animate(0, pct, {
      duration: 1.1,
      ease: EASE,
      delay: 0.3,
      onUpdate: (v) => setShownPct(Math.round(v)),
    });
    return () => controls.stop();
  }, [pct]);

  const di = Math.min(deckIndex, Math.max(0, deck.length - 1));
  const card = deck[di];
  const atStart = di <= 0;
  const atEnd = di >= deck.length - 1;

  // Move the deck to an absolute index, remembering the direction so the card
  // slide animates the right way (and the ladder highlight tracks along).
  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(deck.length - 1, next));
    setDir(clamped >= di ? 1 : -1);
    setDeckIndex(clamped);
  };

  // Switching lists resets the ladder + deck to that list's current/first step.
  const selectList = (i: number) => {
    const clamped = Math.max(0, Math.min(lists.length - 1, i));
    setActiveList(clamped);
    setDir(1);
    setDeckIndex(defaultIdxFor(lists[clamped].steps));
  };

  return (
    <div className="relative min-h-screen bg-[radial-gradient(1000px_440px_at_20%_-8%,_rgb(var(--brand)_/_0.10),_transparent_60%),var(--paper)] px-4 pt-5 pb-16 text-ink sm:px-6 lg:px-10 lg:pt-7 lg:pb-[70px]">
      <div className="mx-auto max-w-[1100px]">
        {/* ── HEADER ── */}
        <SectionReveal className="relative z-50">
          <Reveal>
            <header className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {config.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.logoUrl}
                    alt=""
                    className="h-[50px] w-auto max-w-[200px] flex-none object-contain [filter:var(--logo-filter)]"
                  />
                ) : (
                  <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-brand font-serif text-[20px] font-semibold text-on-accent">
                    {config.churchName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 leading-tight">
                  <div className="truncate font-serif text-[19px] font-semibold">{config.churchName}</div>
                  {config.tagline && (
                    <div className="mt-0.5 max-w-[280px] truncate text-[11.5px] text-ink-muted">{config.tagline}</div>
                  )}
                </div>
              </div>

              <div ref={menuRef} className="relative shrink-0">
                <motion.button
                  onClick={() => setMenuOpen((o) => !o)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING_SOFT}
                  className="flex cursor-pointer items-center gap-2.5 rounded-full border border-edge bg-card py-1.5 pl-[14px] pr-[9px]"
                >
                  <div className="text-[13px] font-bold">{firstName}</div>
                  <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-edge bg-card-2 text-[13px] font-bold text-ink-soft">
                    {firstName.charAt(0)}
                  </div>
                </motion.button>

                <AnimatePresence>
                  {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: EASE }}
                        className="absolute right-0 top-[calc(100%+10px)] z-50 w-[322px] max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-[18px] border border-edge bg-card shadow-[0_30px_64px_-26px_rgba(20,12,8,0.4)]"
                      >
                        <div className="bg-card-2 px-5 pb-[15px] pt-[18px]">
                          <div className="text-[9.5px] font-extrabold tracking-[2.2px] text-brand">YOUR NEXT STEP</div>
                          <div className="mt-[5px] font-serif text-[22px] leading-[1.12]">{trackCurrent?.label ?? ""}</div>
                        </div>
                        <div className="h-px bg-hairline-soft" />
                        <div className="px-5 pb-1.5 pt-[14px]">
                          {lists.map((list) => {
                            const ld = list.steps.filter((s) => s.completed).length;
                            return (
                              <div key={list.label} className="mb-3">
                                <div className="text-[9.5px] font-bold uppercase tracking-[1.8px] text-faint">
                                  {list.label} · {ld}/{list.steps.length}
                                </div>
                                <div className="mt-2.5 flex flex-col gap-2">
                                  {list.steps.map((s) => (
                                    <div key={s.key} className="flex items-center gap-[9px]">
                                      {s.completed ? (
                                        <div className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-brand">
                                          <span className="text-[8px] leading-none text-on-accent">✓</span>
                                        </div>
                                      ) : s.inProgress ? (
                                        <div className="h-4 w-4 flex-none rounded-full border-2 border-brand bg-card" />
                                      ) : (
                                        <div className="h-4 w-4 flex-none rounded-full border-2 border-upcoming bg-card" />
                                      )}
                                      <div
                                        className={`text-[13px] ${s.inProgress ? "font-bold" : "font-medium"} ${
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
                        <div className="px-[15px] py-3">
                          <motion.button
                            onClick={() => setMenuOpen(false)}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            transition={SPRING_SOFT}
                            className="w-full cursor-pointer rounded-[10px] bg-ink py-[11px] text-[13px] font-bold text-paper"
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
          <section className="mx-auto mt-8 max-w-[680px] text-center lg:mt-[42px]">
            <SubheadingReveal
              delay={0.4}
              className="min-h-[14px] text-[11.5px] font-bold uppercase tracking-[3px] text-brand"
            >
              {greeting ?? " "}
            </SubheadingReveal>
            <h1 className="mt-3.5 font-serif text-[36px] font-medium leading-[1.06] tracking-[-.4px] sm:text-[44px] lg:text-[52px] lg:leading-[1.04]">
              <HeadingReveal as="span" className="inline">
                Welcome back,
              </HeadingReveal>{" "}
              <HeadingReveal as="span" delay={0.18} className="inline italic text-brand">
                {firstName}
              </HeadingReveal>
            </h1>
            {config.welcomeLine && (
              <ParagraphReveal
                delay={0.5}
                className="mx-auto mt-4 max-w-[520px] text-center text-[17px] leading-[1.55] text-ink-soft"
              >
                {config.welcomeLine}
              </ParagraphReveal>
            )}
          </section>
        </SectionReveal>

        {/* ── TRACK LADDER + NEXT-STEP DECK ── */}
        <SectionReveal>
          <section className="mt-8 grid grid-cols-1 items-stretch gap-5 lg:mt-10 lg:grid-cols-[360px_1fr] lg:gap-[22px]">
            {/* Ladder */}
            <Reveal className="h-full">
              <div className="h-full rounded-[22px] border border-edge bg-card px-[26px] py-6">
                <div className="flex items-center gap-4">
                  <div className="relative h-[78px] w-[78px] flex-none">
                    <svg width="78" height="78" viewBox="0 0 100 100" className="-rotate-90">
                      <circle cx="50" cy="50" r={RING_R} fill="none" className="stroke-upcoming" strokeWidth="8" />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r={RING_R}
                        fill="none"
                        className="stroke-brand"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={RING_C.toFixed(1)}
                        initial={{ strokeDashoffset: RING_C }}
                        animate={{ strokeDashoffset: ringOffset }}
                        transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-serif text-[22px]">
                      {shownPct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[2px] text-faint">YOUR JOURNEY</div>
                    <div className="mt-[3px] font-serif text-[21px] leading-[1.1]">
                      {done}/{total} steps
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-ink-muted">{total - done} steps to go</div>
                  </div>
                </div>

                {lists.length > 1 && (
                  <LayoutGroup>
                    <div className="mt-5 flex gap-0.5 rounded-[11px] bg-card-2 p-[3px]">
                      {lists.map((list, i) => (
                        <button
                          key={list.label}
                          onClick={() => selectList(i)}
                          className={`relative flex-1 cursor-pointer rounded-[9px] px-3 py-[7px] text-[12px] font-bold transition-colors ${
                            i === ai ? "text-on-accent" : "text-ink-soft hover:text-ink"
                          }`}
                        >
                          {i === ai && (
                            <motion.span
                              layoutId="guide-seg"
                              transition={SPRING}
                              className="absolute inset-0 rounded-[9px] bg-brand shadow-[0_2px_8px_-2px_rgb(var(--brand)_/_0.5)]"
                            />
                          )}
                          <span className="relative z-10">{list.label}</span>
                        </button>
                      ))}
                    </div>
                  </LayoutGroup>
                )}

                <LayoutGroup>
                  <div className="mt-[22px] flex flex-col">
                    {active.steps.map((s, i) => {
                      const notLast = i < active.steps.length - 1;
                      const isViewing = di === i;
                      return (
                        <Reveal key={s.key} delay={0.18 + i * 0.08}>
                        <div
                          onClick={() => goTo(i)}
                          className="flex cursor-pointer items-stretch gap-[13px]"
                        >
                          <div className="flex w-6 flex-none flex-col items-center">
                            {s.completed ? (
                              <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand">
                                <span className="text-[11px] leading-none text-on-accent">✓</span>
                              </div>
                            ) : s.inProgress ? (
                              <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-[2.5px] border-brand bg-card animate-[ggPulse_2.6s_ease-in-out_infinite]">
                                <div className="h-[7px] w-[7px] rounded-full bg-brand" />
                              </div>
                            ) : (
                              <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 border-upcoming bg-card-2">
                                <span className="text-[10px] font-bold text-faint">{i + 1}</span>
                              </div>
                            )}
                            {notLast && (
                              <div className={`mt-1 min-h-[18px] w-0.5 flex-1 ${s.completed ? "bg-brand" : "bg-upcoming"}`} />
                            )}
                          </div>
                          <div className="relative flex-1 pb-3.5">
                            {isViewing && (
                              <motion.div
                                layoutId="guide-ladder-active"
                                transition={SPRING}
                                className="absolute -left-2 -right-2 -top-1 bottom-2 rounded-[10px] border border-brand/20 bg-brand/10"
                              />
                            )}
                            <motion.div
                              whileHover={isViewing ? undefined : { x: 3 }}
                              transition={SPRING_SOFT}
                              className="relative"
                            >
                              <div
                                className={`text-[14.5px] leading-[1.2] transition-colors ${
                                  s.inProgress ? "font-bold" : "font-semibold"
                                } ${!s.completed && !s.inProgress ? (isViewing ? "text-ink" : "text-faint") : "text-ink"}`}
                              >
                                {s.label}
                              </div>
                              <div className="mt-px text-[11px] text-faint">{statusLabel(s)}</div>
                            </motion.div>
                          </div>
                        </div>
                        </Reveal>
                      );
                    })}
                  </div>
                </LayoutGroup>
              </div>
            </Reveal>

            {/* Next-step deck */}
            {card && (
              <ScaleReveal delay={0.1} className="h-full">
                <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] bg-[linear-gradient(155deg,_rgb(var(--brand)),_rgb(var(--brand-card)))] px-6 py-7 text-on-accent shadow-[0_24px_54px_-26px_rgb(var(--brand-card)_/_0.6)] sm:px-9 lg:py-[34px]">
                  <div className="pointer-events-none absolute -right-[50px] -top-[80px] h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,_rgba(255,220,205,0.2),_transparent_70%)]" />
                  <div className="relative flex items-center justify-between">
                    <div className="text-[11px] font-extrabold tracking-[2.6px] text-on-accent/70">YOUR PATHWAY</div>
                    <div className="font-serif text-[15px] text-on-accent/70">
                      {di + 1} / {deck.length}
                    </div>
                  </div>
                  <div className="relative flex flex-1 flex-col justify-center py-[22px]">
                    <AnimatePresence mode="popLayout" custom={dir} initial={false}>
                      <motion.div
                        key={card.key}
                        custom={dir}
                        variants={slideDeck}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={SPRING}
                      >
                        <div className="self-start rounded-full bg-on-accent/15 px-[13px] py-[5px] text-[10.5px] font-bold tracking-[1.4px]">
                          {deckTag(card)}
                        </div>
                        <h2 className="mt-4 font-serif text-[30px] font-medium leading-[1.08] tracking-[-.4px] sm:text-[36px] lg:text-[40px] lg:leading-[1.05]">
                          {card.label}
                        </h2>
                        {card.description && (
                          <p className="mt-4 max-w-[560px] text-[16px] leading-[1.55] text-on-accent/80">
                            {card.description}
                          </p>
                        )}
                        <div className="mt-[26px] flex flex-wrap items-center gap-4">
                          <motion.button
                            onClick={() => openCTA(card?.label)}
                            whileHover={{ y: -2, boxShadow: "0 14px 26px -8px rgba(0,0,0,0.4)" }}
                            whileTap={{ scale: 0.98 }}
                            transition={SPRING_SOFT}
                            className="cursor-pointer rounded-[13px] bg-accent-btn px-6 py-[15px] text-[15px] font-bold text-accent-btn-ink"
                          >
                            {(card.ctaLabel ?? (card.completed ? "Revisit" : "Get started"))} →
                          </motion.button>
                          {card.meta && <div className="text-[12.5px] text-on-accent/70">{card.meta}</div>}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="relative mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-[7px]">
                      {deck.map((d, i) => (
                        <motion.button
                          key={d.key}
                          onClick={() => goTo(i)}
                          aria-label={`Go to step ${i + 1}`}
                          animate={{ width: i === di ? 22 : 7 }}
                          transition={SPRING}
                          className={`h-[7px] cursor-pointer rounded-full ${i === di ? "bg-on-accent" : "bg-on-accent/40"}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-[9px]">
                      <motion.button
                        onClick={() => goTo(di - 1)}
                        disabled={atStart}
                        whileHover={atStart ? undefined : { scale: 1.08 }}
                        whileTap={atStart ? undefined : { scale: 0.92 }}
                        transition={SPRING_SOFT}
                        className={`flex h-[42px] w-[42px] items-center justify-center rounded-full border border-on-accent/25 text-[17px] text-on-accent ${
                          atStart ? "cursor-default bg-on-accent/5 opacity-40" : "cursor-pointer bg-on-accent/15"
                        }`}
                      >
                        ←
                      </motion.button>
                      <motion.button
                        onClick={() => goTo(di + 1)}
                        disabled={atEnd}
                        whileHover={atEnd ? undefined : { scale: 1.08 }}
                        whileTap={atEnd ? undefined : { scale: 0.92 }}
                        transition={SPRING_SOFT}
                        className={`flex h-[42px] w-[42px] items-center justify-center rounded-full border border-on-accent/25 text-[17px] text-on-accent ${
                          atEnd ? "cursor-default bg-on-accent/5 opacity-40" : "cursor-pointer bg-on-accent/15"
                        }`}
                      >
                        →
                      </motion.button>
                    </div>
                  </div>
                </div>
              </ScaleReveal>
            )}
          </section>
        </SectionReveal>

        {/* ── GROUP + GIVING (hardcoded) ── */}
        <SectionReveal>
          <section className="mt-4 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:mt-[18px] lg:gap-[18px]">
            <Reveal className="h-full">
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-wrap items-center justify-between gap-[18px] rounded-[22px] border border-edge bg-card px-[26px] py-[22px]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 flex-none rounded-[13px] border border-edge bg-[repeating-linear-gradient(45deg,_var(--card-2),_var(--card-2)_6px,_var(--edge)_6px,_var(--edge)_12px)]" />
                  <div>
                    <div className="text-[10px] font-bold tracking-[1.6px] text-faint">YOUR GROUP</div>
                    <div className="mt-0.5 font-serif text-[20px] leading-[1.1]">{GROUP.name}</div>
                    <div className="mt-px text-[12.5px] text-ink-muted">
                      {GROUP.nextMeeting} · {GROUP.host}
                    </div>
                  </div>
                </div>
                <motion.button
                  onClick={() => openCTA("Group Details")}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING_SOFT}
                  className="flex-none cursor-pointer rounded-[11px] bg-ink px-[17px] py-[11px] text-[13.5px] font-bold text-paper"
                >
                  Details
                </motion.button>
              </motion.div>
            </Reveal>
            <Reveal delay={0.08} className="h-full">
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-wrap items-center justify-between gap-[18px] rounded-[22px] border border-edge bg-card px-[26px] py-[22px]"
              >
                <div>
                  <div className="text-[10px] font-bold tracking-[1.6px] text-faint">YOUR GIVING · {GIVING.year}</div>
                  <div className="mt-[5px] flex items-baseline gap-[9px]">
                    <CountUpCurrency
                      value={GIVING.amount}
                      className="font-serif text-[38px] leading-none tracking-[-1px]"
                    />
                    <div className="text-[12.5px] text-ink-muted">{GIVING.gifts} gifts</div>
                  </div>
                  <div className="mt-1.5 max-w-[240px] font-serif text-[12px] italic text-ink-muted">{GIVING.gratitude}</div>
                </div>
                <motion.button
                  onClick={() => openCTA("Giving")}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING_SOFT}
                  className="flex-none cursor-pointer rounded-[11px] bg-brand px-[18px] py-[11px] text-[13.5px] font-bold text-on-accent"
                >
                  Give again
                </motion.button>
              </motion.div>
            </Reveal>
          </section>
        </SectionReveal>

        {/* ── PRAYER + SERMON NOTES (hardcoded) — split mirrors the ladder/deck row ── */}
        <SectionReveal>
          <section className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:mt-[18px] lg:grid-cols-[360px_1fr] lg:gap-[18px]">
            {/* Prayer requests — narrow left, mirroring the ladder */}
            <Reveal className="h-full">
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-col rounded-[22px] border border-edge bg-card px-[26px] py-[22px]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold tracking-[1.6px] text-faint">PRAYER REQUESTS</div>
                  <div className="text-[11px] font-bold text-brand">{PRAYERS.length} active</div>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {PRAYERS.map((p) => (
                    <div key={p.text} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 text-[13.5px] leading-[1.3] text-ink">{p.text}</div>
                      <div className="flex-none text-[11.5px] text-ink-muted">
                        <span className="text-brand">♥</span> {p.praying}
                      </div>
                    </div>
                  ))}
                </div>
                <motion.button
                  onClick={() => openCTA("Prayer Requests")}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING_SOFT}
                  className="mt-auto flex-none cursor-pointer self-start rounded-[11px] bg-ink px-[17px] py-[11px] text-[13.5px] font-bold text-paper"
                >
                  Share a request
                </motion.button>
              </motion.div>
            </Reveal>

            {/* Sermon notes — wide right */}
            <Reveal delay={0.08} className="h-full">
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-col rounded-[22px] border border-edge bg-card px-[26px] py-[22px]"
              >
                <h3 className="font-serif text-[24px] leading-[1.1]">Sermon Notes</h3>
                <div className="mt-3.5 rounded-[14px] bg-card-2 px-4 py-4">
                  <div className="text-[10px] font-bold tracking-[1.6px] text-faint">YOUR LATEST NOTE</div>
                  <p className="mt-2 font-serif text-[15px] italic leading-[1.5] text-ink-soft">{SERMON.latestNote}</p>
                </div>
                <motion.button
                  onClick={() => openCTA("Sermon Notes")}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING_SOFT}
                  className="mt-auto w-full cursor-pointer rounded-[11px] bg-ink py-3 text-[13.5px] font-bold text-paper"
                >
                  View all notes
                </motion.button>
              </motion.div>
            </Reveal>
          </section>
        </SectionReveal>
      </div>
    </div>
  );
}
