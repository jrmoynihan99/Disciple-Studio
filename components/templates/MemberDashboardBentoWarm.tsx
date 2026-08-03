"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup, animate } from "framer-motion";
import type { ChurchConfig } from "@/lib/types";
import { getMemberProgress, type StepItem } from "@/lib/steps";
import { useClickOutside } from "@/lib/useClickOutside";
import { EASE, SPRING, SPRING_SOFT, swapUp } from "@/lib/motion";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import CountUpCurrency from "@/components/CountUpCurrency";
import { useDemoCTA } from "@/context/DemoCTAContext";

/**
 * Warm Bento member dashboard — React/Tailwind port of `dashboard-warm-bento`.
 * 12-col bento grid: greeting, a circular progress ring, a segmented two-list
 * toggle, a brand-colored "next step" tile, plus hardcoded group + giving tiles.
 *
 * Tiles reveal on load (staggered) via the reveal-animations. The segmented
 * toggle glides a shared-element pill between lists; switching lists crossfades
 * the rows and the next-step tile; the ring + percentage animate up on load.
 *
 * Self-chromed. All colors from the semantic palette tokens injected by
 * DemoChrome, so it adapts to light/dark. Serif = the configured `font-serif`.
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
  gratitude: "Thank you — every gift went into people far from God finding their way home.",
};
const SERMON = {
  latestNote: "Grace didn't wait at the door — it ran down the road to meet him.",
};

const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;

function statusLabel(s: StepItem): string {
  return s.completed ? "Completed" : s.inProgress ? "You're here" : "Upcoming";
}
function currentOf(steps: StepItem[]): StepItem | undefined {
  return steps.find((s) => s.inProgress) ?? steps.find((s) => !s.completed) ?? steps[0];
}

export default function MemberDashboardBentoWarm({ config }: { config: ChurchConfig }) {
  const { demoMember } = config;
  const firstName = demoMember.firstName;
  const openCTA = useDemoCTA();

  const { discipleshipSteps, nextSteps } = getMemberProgress(config);
  const lists = [{ label: config.trackLabel ?? "Discipleship track", steps: discipleshipSteps }];
  if (nextSteps.length) lists.push({ label: "Next steps", steps: nextSteps });

  const [activeList, setActiveList] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
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

  const ai = Math.min(activeList, lists.length - 1);
  const active = lists[ai];
  const track = lists[0];
  // The ring + journey stat show overall progress across BOTH lists.
  const allSteps = lists.flatMap((l) => l.steps);
  const done = allSteps.filter((s) => s.completed).length;
  const total = allSteps.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const ringOffset = RING_C * (1 - pct / 100);
  // Any step is selectable; the colored tile previews it. A selection from
  // another list falls back to that list's current step on switch.
  const selected = active.steps.find((s) => s.key === selectedKey) ?? currentOf(active.steps);
  const trackCurrent = currentOf(track.steps);

  // Count the percentage up on load (paired with the ring sweep below).
  const [shownPct, setShownPct] = useState(0);
  useEffect(() => {
    const controls = animate(0, pct, {
      duration: 1.1,
      ease: EASE,
      delay: 0.25,
      onUpdate: (v) => setShownPct(Math.round(v)),
    });
    return () => controls.stop();
  }, [pct]);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(900px_420px_at_85%_-6%,_rgb(var(--brand)_/_0.14),_transparent_60%),var(--paper)] px-4 pt-5 pb-14 text-ink sm:px-6 lg:px-[30px] lg:pb-[60px]">
      <div className="mx-auto max-w-[1200px]">
        {/* ── HEADER ── */}
        <SectionReveal className="relative z-50">
          <Reveal>
            <header className="mb-[18px] flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
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
                  className="flex cursor-pointer items-center gap-2.5 rounded-full border border-edge bg-card py-1.5 pl-[13px] pr-2"
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
                        className="absolute right-0 top-[calc(100%+10px)] z-50 w-[320px] max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-[18px] border border-edge bg-card shadow-[0_30px_64px_-26px_rgba(20,12,6,0.4)]"
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

        {/* ── BENTO GRID ── */}
        <SectionReveal>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Greeting — the card sits while its headline word-reveals. */}
            <div className="lg:col-start-1 lg:col-span-7">
              <div className="h-full rounded-[22px] border border-edge bg-card px-[30px] py-7">
                <SubheadingReveal
                  delay={0.4}
                  className="min-h-[14px] text-[11px] font-bold uppercase tracking-[2.6px] text-brand"
                >
                  {greeting ?? " "}
                </SubheadingReveal>
                <h1 className="mt-3 font-serif text-[34px] font-medium leading-[1.04] tracking-[-.5px] sm:text-[40px] lg:text-[46px] lg:leading-[1.02]">
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
                    className="mt-3.5 max-w-[420px] text-[15.5px] leading-[1.5] text-ink-soft"
                  >
                    {config.welcomeLine}
                  </ParagraphReveal>
                )}
              </div>
            </div>

            {/* Progress ring */}
            <Reveal delay={0.07} className="lg:col-start-8 lg:col-span-5">
              <div className="flex h-full items-center gap-[22px] rounded-[22px] border border-edge bg-[linear-gradient(155deg,_var(--card),_var(--card-2))] px-7 py-6">
                <div className="relative h-28 w-28 flex-none">
                  <svg width="112" height="112" viewBox="0 0 100 100" className="-rotate-90">
                    <circle cx="50" cy="50" r={RING_R} fill="none" className="stroke-upcoming" strokeWidth="9" />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r={RING_R}
                      fill="none"
                      className="stroke-brand"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={RING_C.toFixed(1)}
                      initial={{ strokeDashoffset: RING_C }}
                      animate={{ strokeDashoffset: ringOffset }}
                      transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="font-serif text-[30px] leading-none">{shownPct}%</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-bold tracking-[2px] text-faint">YOUR JOURNEY</div>
                  <div className="mt-1 font-serif text-[24px] leading-[1.1]">
                    {done}/{total} steps
                  </div>
                  <div className="mt-1 text-[13px] text-ink-soft">{total - done} steps to go</div>
                </div>
              </div>
            </Reveal>

            {/* List tile (segmented) */}
            <Reveal delay={0.14} className="lg:col-start-1 lg:col-span-7 lg:row-start-2 lg:row-span-2">
              <div className="flex h-full flex-col rounded-[22px] border border-edge bg-card px-[26px] py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-serif text-[22px] font-semibold">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={active.label}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.22, ease: EASE }}
                        className="inline-block"
                      >
                        {active.label}
                      </motion.span>
                    </AnimatePresence>
                  </h2>
                  {lists.length > 1 && (
                    <LayoutGroup>
                      <div className="flex gap-0.5 rounded-[11px] bg-card-2 p-[3px]">
                        {lists.map((list, i) => (
                          <button
                            key={list.label}
                            onClick={() => setActiveList(i)}
                            className={`relative cursor-pointer rounded-[9px] px-[13px] py-[7px] text-[12.5px] font-bold transition-colors ${
                              i === ai ? "text-on-accent" : "text-ink-soft hover:text-ink"
                            }`}
                          >
                            {i === ai && (
                              <motion.span
                                layoutId="bento-seg"
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
                </div>
                <div className="mt-[18px] flex flex-col gap-2.5">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={ai}
                      exit={{ opacity: 0, transition: { duration: 0.14, ease: EASE } }}
                      className="flex flex-col gap-2.5"
                    >
                      {active.steps.map((s, i) => {
                        const isSelected = s.key === selected?.key;
                        return (
                        <Reveal key={s.key} delay={0.24 + i * 0.07}>
                        <motion.div
                          onClick={() => setSelectedKey(s.key)}
                          whileHover={{ x: 3 }}
                          whileTap={{ scale: 0.99 }}
                          transition={SPRING_SOFT}
                          className={`flex cursor-pointer items-center gap-[13px] rounded-[13px] px-[13px] py-[11px] transition-colors ${
                            isSelected
                              ? "border border-brand/35 bg-brand/[0.12]"
                              : s.inProgress
                                ? "border border-brand/15 bg-brand/[0.05] hover:bg-brand/[0.08]"
                                : "border border-transparent hover:bg-ink/[0.03]"
                          }`}
                        >
                          {s.completed ? (
                            <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-brand">
                              <span className="text-[12px] leading-none text-on-accent">✓</span>
                            </div>
                          ) : s.inProgress ? (
                            <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border-[2.5px] border-brand bg-card animate-[bnPulse_2.6s_ease-in-out_infinite]">
                              <div className="h-2 w-2 rounded-full bg-brand" />
                            </div>
                          ) : (
                            <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border-2 border-upcoming bg-card-2">
                              <span className="text-[11px] font-bold text-faint">{i + 1}</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-[15px] leading-[1.2] ${s.inProgress ? "font-bold" : "font-semibold"} ${
                                !s.completed && !s.inProgress && !isSelected ? "text-faint" : "text-ink"
                              }`}
                            >
                              {s.label}
                            </div>
                            <div className="mt-px text-[11.5px] text-faint">{statusLabel(s)}</div>
                          </div>
                          {isSelected ? (
                            <div className="flex-none rounded-full bg-brand/15 px-[11px] py-[5px] text-[10px] font-extrabold tracking-[.6px] text-brand">
                              SHOWN
                            </div>
                          ) : s.inProgress ? (
                            <div className="flex-none rounded-full bg-brand/10 px-[11px] py-[5px] text-[10px] font-extrabold tracking-[.6px] text-brand">
                              NEXT
                            </div>
                          ) : null}
                        </motion.div>
                        </Reveal>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </Reveal>

            {/* Selected-step colored tile */}
            {selected && (
              <Reveal delay={0.1} className="lg:col-start-8 lg:col-span-5 lg:row-start-2">
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={SPRING_SOFT}
                  className="relative h-full overflow-hidden rounded-[22px] bg-[linear-gradient(150deg,_rgb(var(--brand)),_rgb(var(--brand-card)))] px-7 py-[26px] text-on-accent shadow-[0_20px_46px_-24px_rgb(var(--brand-card)_/_0.6)]"
                >
                  <div className="pointer-events-none absolute -right-[40px] -top-[60px] h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,_rgba(255,220,200,0.22),_transparent_70%)]" />
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={selected.key}
                      variants={swapUp}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.3, ease: EASE }}
                      className="relative"
                    >
                      <div className="text-[10px] font-extrabold tracking-[2.2px] text-on-accent/70">
                        {selected.completed ? "COMPLETED ✓" : selected.inProgress ? "YOUR NEXT STEP" : "COMING UP"}
                      </div>
                      <div className="mt-2.5 font-serif text-[28px] leading-[1.08]">{selected.label}</div>
                      {selected.description && (
                        <p className="mt-[11px] text-[14px] leading-[1.5] text-on-accent/80">{selected.description}</p>
                      )}
                      <motion.button
                        onClick={() => openCTA(selected?.label)}
                        whileHover={{ y: -2, boxShadow: "0 12px 22px -8px rgba(0,0,0,0.4)" }}
                        whileTap={{ scale: 0.98 }}
                        transition={SPRING_SOFT}
                        className="mt-[18px] cursor-pointer rounded-[11px] bg-accent-btn px-[19px] py-[13px] text-[14px] font-bold text-accent-btn-ink"
                      >
                        {(selected.ctaLabel ?? (selected.completed ? "Revisit" : "Get started"))} →
                      </motion.button>
                      {selected.meta && <span className="ml-3 text-[12px] text-on-accent/60">{selected.meta}</span>}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </Reveal>
            )}

            {/* Group tile (hardcoded) */}
            <Reveal delay={0.16} className="lg:col-start-8 lg:col-span-5 lg:row-start-3">
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="h-full rounded-[22px] border border-edge bg-card px-[26px] py-[22px]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10.5px] font-bold tracking-[2px] text-faint">YOUR GROUP</div>
                  <div className="text-[11px] font-bold text-brand">Active</div>
                </div>
                <div className="mt-[9px] font-serif text-[21px] leading-[1.1]">{GROUP.name}</div>
                <div className="mt-[3px] text-[12.5px] text-ink-soft">Hosted by {GROUP.host}</div>
                <div className="mt-3.5 flex items-center justify-between border-t border-hairline-soft pt-[13px]">
                  <div>
                    <div className="text-[10px] font-bold tracking-[1.4px] text-faint">NEXT MEETING</div>
                    <div className="mt-0.5 text-[14px] font-bold">{GROUP.nextMeeting}</div>
                  </div>
                  <button
                    onClick={() => openCTA("Group Details")}
                    className="cursor-pointer text-[12.5px] font-bold text-brand transition-transform hover:translate-x-0.5"
                  >
                    Details →
                  </button>
                </div>
              </motion.div>
            </Reveal>

            {/* Giving tile (hardcoded) — wide right of the row, mirroring the rows above */}
            <Reveal delay={0.2} className="lg:col-start-6 lg:col-span-7 lg:row-start-4">
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-wrap items-center justify-between gap-[26px] rounded-[22px] border border-edge bg-card px-[30px] py-6"
              >
                <div className="flex flex-wrap items-baseline gap-[18px]">
                  <div>
                    <div className="text-[10.5px] font-bold tracking-[2px] text-faint">YOUR GIVING · {GIVING.year}</div>
                    <div className="mt-2 flex items-baseline gap-2.5">
                      <CountUpCurrency
                        value={GIVING.amount}
                        className="font-serif text-[46px] leading-none tracking-[-1px]"
                      />
                      <div className="text-[13px] text-ink-soft">{GIVING.gifts} gifts</div>
                    </div>
                  </div>
                  <p className="m-0 max-w-[400px] font-serif text-[16px] italic leading-[1.4] text-ink-soft">
                    {GIVING.gratitude}
                  </p>
                </div>
                <div className="flex flex-none gap-2.5">
                  <motion.button
                    onClick={() => openCTA("Giving")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_SOFT}
                    className="cursor-pointer rounded-[11px] bg-brand px-5 py-[13px] text-[14px] font-bold text-on-accent"
                  >
                    Give again
                  </motion.button>
                  <motion.button
                    onClick={() => openCTA("Giving")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_SOFT}
                    className="cursor-pointer rounded-[11px] border border-edge bg-transparent px-[18px] py-[13px] text-[14px] font-semibold text-ink-soft"
                  >
                    Statement
                  </motion.button>
                </div>
              </motion.div>
            </Reveal>

            {/* Sermon notes tile — narrow left of the row (mirrored split) */}
            <Reveal delay={0.24} className="lg:col-start-1 lg:col-span-5 lg:row-start-4">
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-col rounded-[22px] border border-edge bg-card px-[26px] py-[22px]"
              >
                <h3 className="font-serif text-[24px] leading-[1.1]">Sermon Notes</h3>
                <div className="mt-3.5 rounded-[14px] bg-card-2 px-4 py-3.5">
                  <div className="text-[10px] font-bold tracking-[1.6px] text-faint">YOUR LATEST NOTE</div>
                  <p className="mt-1.5 font-serif text-[14px] italic leading-[1.45] text-ink-soft">{SERMON.latestNote}</p>
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
          </div>
        </SectionReveal>
      </div>
    </div>
  );
}
