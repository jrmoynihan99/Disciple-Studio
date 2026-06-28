"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChurchConfig } from "@/lib/types";
import { getMemberProgress, type StepItem } from "@/lib/steps";
import { EASE, SPRING, SPRING_SOFT, swapUp } from "@/lib/motion";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import ScaleReveal from "@/components/reveal-animations/ScaleReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import CountUpCurrency from "@/components/CountUpCurrency";
import { StepIcon } from "@/lib/icons";
import { useDemoCTA } from "@/context/DemoCTAContext";
import MemberMenu from "./shared/MemberMenu";

/**
 * Orbit — the bold one. The member's whole journey as a constellation.
 *
 * Steps are stars on a ring around a glowing core that shows overall progress.
 * Tap a star (or use the arrows) and the constellation rotates it to the top
 * while a detail panel crossfades to that step. Dramatic scale, high contrast,
 * cinematic spring motion — but every color still comes from the warm palette
 * tokens, so it reads bold without going cold/techy.
 *
 * Self-chromed (own header + shared member dropdown). Serif = the configured
 * `font-serif` (Spectral by default for this template's display feel).
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
const PRAYERS = [
  { text: "Healing for my dad's recovery", praying: 14 },
  { text: "Wisdom about a big decision", praying: 6 },
];

const R_NODE = 38; // node ring radius, % of the square stage
const R_RING = 31; // progress ring radius, viewBox units
const RING_C = 2 * Math.PI * R_RING;

function statusEyebrow(s: StepItem): string {
  return s.completed ? "COMPLETED ✓" : s.inProgress ? "YOUR NEXT STEP" : "COMING UP";
}

/** Shortest signed angular delta (deg) from `from` to `to`, in (-180, 180]. */
function shortestDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

export default function MemberOrbit({ config }: { config: ChurchConfig }) {
  const firstName = config.demoMember.firstName;
  const openCTA = useDemoCTA();

  const { discipleshipSteps, nextSteps } = getMemberProgress(config);
  const steps = useMemo(() => [...discipleshipSteps, ...nextSteps], [discipleshipSteps, nextSteps]);
  const n = steps.length;
  const total = n;
  const done = steps.filter((s) => s.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const step = n ? 360 / n : 360;

  // Default focus: the in-progress step, else the first incomplete one.
  const defaultIdx = useMemo(() => {
    const ip = steps.findIndex((s) => s.inProgress);
    if (ip >= 0) return ip;
    const fi = steps.findIndex((s) => !s.completed);
    return fi >= 0 ? fi : 0;
  }, [steps]);

  const [sel, setSel] = useState(defaultIdx);
  // Rotation that brings the selected node to the top (-90°): -sel*step.
  const [rotation, setRotation] = useState(-defaultIdx * step);

  const select = (i: number) => {
    const clamped = Math.max(0, Math.min(n - 1, i));
    setRotation((prev) => prev + shortestDelta(prev, -clamped * step));
    setSel(clamped);
  };

  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => {
    const h = new Date().getHours();
    const word = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    setGreeting(`${word} · ${date}`);
  }, []);

  // Precompute static node geometry (base angles never change; the group rotates).
  const nodes = useMemo(
    () =>
      steps.map((s, i) => {
        const deg = -90 + i * step;
        const rad = (deg * Math.PI) / 180;
        return { s, i, x: 50 + R_NODE * Math.cos(rad), y: 50 + R_NODE * Math.sin(rad) };
      }),
    [steps, step],
  );

  const active = steps[sel];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[radial-gradient(1100px_700px_at_50%_-10%,_rgb(var(--brand)_/_0.16),_transparent_62%),var(--paper)] text-ink">
      {/* Ambient drifting glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-1/2 top-[34%] h-[70vw] w-[70vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgb(var(--brand)_/_0.10),_transparent_64%)] blur-[40px] animate-[edDrift1_34s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-[2] mx-auto max-w-[1180px] px-5 pb-16 sm:px-8">
        {/* ── HEADER ── */}
        <SectionReveal className="relative z-50">
          <Reveal>
            <header className="flex items-center justify-between gap-3 py-5">
              <div className="flex min-w-0 items-center gap-3">
                {config.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.logoUrl}
                    alt=""
                    className="h-[46px] w-auto max-w-[190px] flex-none object-contain [filter:var(--logo-filter)]"
                  />
                ) : (
                  <div className="flex h-[40px] w-[40px] flex-none items-center justify-center rounded-[12px] bg-brand font-serif text-[21px] font-semibold text-on-accent">
                    {config.churchName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 leading-tight">
                  <div className="truncate font-serif text-[18px] font-semibold">{config.churchName}</div>
                  {config.tagline && (
                    <div className="mt-0.5 max-w-[260px] truncate text-[11.5px] text-ink-muted">{config.tagline}</div>
                  )}
                </div>
              </div>
              <MemberMenu config={config} />
            </header>
          </Reveal>
        </SectionReveal>

        {/* ── TITLE ── */}
        <SectionReveal>
          <div className="mx-auto max-w-[720px] pt-6 text-center sm:pt-10">
            <SubheadingReveal delay={0.3} className="min-h-[16px] text-[12px] font-bold uppercase tracking-[3.4px] text-brand">
              {greeting ?? " "}
            </SubheadingReveal>
            <h1 className="mt-4 font-serif text-[clamp(38px,7vw,68px)] font-medium leading-[1.0] tracking-[-1px]">
              Your journey, <span className="italic text-brand">{firstName}</span>
            </h1>
            <Reveal delay={0.5}>
              <p className="mx-auto mt-4 max-w-[460px] text-[16px] leading-[1.55] text-ink-soft">
                Every step, one constellation. Tap a star to see where it leads.
              </p>
            </Reveal>
          </div>
        </SectionReveal>

        {/* ── STAGE: orbit + detail ── */}
        <div className="mt-8 grid items-center gap-8 lg:mt-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
          {/* Orbit */}
          <ScaleReveal delay={0.1}>
            <div className="relative mx-auto aspect-square w-full max-w-[400px] lg:max-w-[540px]">
              {/* Decorative slow-spinning guide ring */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full animate-[osSpin_46s_linear_infinite]">
                <circle cx="50" cy="50" r={R_NODE} fill="none" className="stroke-brand/15" strokeWidth="0.4" strokeDasharray="1 3" />
              </svg>

              {/* Progress ring around the core */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="50" cy="50" r={R_RING} fill="none" className="stroke-upcoming" strokeWidth="1.4" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r={R_RING}
                  fill="none"
                  className="stroke-brand"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeDasharray={RING_C.toFixed(2)}
                  initial={{ strokeDashoffset: RING_C }}
                  animate={{ strokeDashoffset: RING_C * (1 - pct / 100) }}
                  transition={{ duration: 1.2, ease: EASE, delay: 0.4 }}
                />
              </svg>

              {/* Rotating constellation (connectors + nodes) */}
              <motion.div
                className="absolute inset-0"
                style={{ transformOrigin: "50% 50%" }}
                animate={{ rotate: rotation }}
                transition={SPRING}
              >
                {/* Connectors from core to each node */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                  {nodes.map(({ x, y, i }) => (
                    <line
                      key={i}
                      x1="50"
                      y1="50"
                      x2={x}
                      y2={y}
                      strokeWidth={i === sel ? 0.9 : 0.5}
                      className={i === sel ? "stroke-brand" : "stroke-brand/12"}
                    />
                  ))}
                </svg>

                {/* Nodes */}
                {nodes.map(({ s, x, y, i }) => {
                  const isSel = i === sel;
                  return (
                    <button
                      key={s.key}
                      onClick={() => select(i)}
                      aria-label={s.label}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ left: `${x}%`, top: `${y}%` }}
                    >
                      {/* Counter-rotate so glyphs stay upright as the ring turns */}
                      <motion.div
                        animate={{ rotate: -rotation, scale: isSel ? 1.16 : 1 }}
                        transition={SPRING}
                        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors sm:h-[52px] sm:w-[52px] ${
                          s.completed
                            ? "border-transparent bg-brand text-on-accent"
                            : s.inProgress
                              ? "border-brand bg-card text-brand animate-[bnPulse_2.6s_ease-in-out_infinite]"
                              : "border-upcoming bg-card text-faint"
                        } ${isSel ? "shadow-[0_0_0_6px_rgb(var(--brand)/0.16),0_14px_30px_-10px_rgb(var(--brand-card)/0.6)]" : ""}`}
                      >
                        {s.completed ? (
                          <span className="text-[16px] leading-none">✓</span>
                        ) : s.icon ? (
                          <StepIcon name={s.icon} className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                        ) : (
                          <span className="text-[13px] font-bold sm:text-[15px]">{i + 1}</span>
                        )}
                      </motion.div>
                    </button>
                  );
                })}
              </motion.div>

              {/* Core — overall progress (static, centered) */}
              <div className="absolute left-1/2 top-1/2 flex aspect-square w-[46%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-[linear-gradient(150deg,_rgb(var(--brand)),_rgb(var(--brand-card)))] text-on-accent shadow-[0_30px_70px_-26px_rgb(var(--brand-card)/0.8)]">
                <div className="pointer-events-none absolute -right-3 -top-3 h-2/3 w-2/3 rounded-full bg-[radial-gradient(circle,_rgba(255,225,210,0.28),_transparent_70%)]" />
                <div className="relative font-serif text-[clamp(40px,11vw,72px)] font-medium leading-none">{pct}%</div>
                <div className="relative mt-1 text-[10px] font-bold uppercase tracking-[2.4px] text-on-accent/75 sm:text-[11px]">
                  Complete
                </div>
                <div className="relative mt-1.5 text-[12px] text-on-accent/70 sm:text-[13px]">
                  {done} of {total} steps
                </div>
              </div>
            </div>
          </ScaleReveal>

          {/* Detail panel for the focused star */}
          <Reveal delay={0.18}>
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center gap-3 lg:justify-start">
                <span className="text-[11px] font-bold uppercase tracking-[2.6px] text-faint">
                  Step {sel + 1} of {total}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-extrabold tracking-[1.4px] ${
                    active?.completed
                      ? "bg-brand/12 text-brand"
                      : active?.inProgress
                        ? "bg-brand text-on-accent"
                        : "bg-card-2 text-ink-muted"
                  }`}
                >
                  {active ? statusEyebrow(active) : ""}
                </span>
              </div>

              <div className="relative mt-4 min-h-[160px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={active?.key ?? "none"}
                    variants={swapUp}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.32, ease: EASE }}
                  >
                    <h2 className="font-serif text-[clamp(30px,5vw,46px)] font-medium leading-[1.06] tracking-[-.5px]">
                      {active?.label}
                    </h2>
                    {active?.description && (
                      <p className="mx-auto mt-4 max-w-[460px] text-[16px] leading-[1.6] text-ink-soft lg:mx-0">
                        {active.description}
                      </p>
                    )}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                      <motion.button
                        onClick={() => openCTA(active?.label)}
                        whileHover={{ y: -2, boxShadow: "0 16px 32px -10px rgb(var(--brand) / 0.55)" }}
                        whileTap={{ scale: 0.98 }}
                        transition={SPRING_SOFT}
                        className="cursor-pointer rounded-full bg-brand px-7 py-[14px] text-[14px] font-bold text-on-accent"
                      >
                        {(active?.ctaLabel ?? (active?.completed ? "Revisit" : "Get started"))} →
                      </motion.button>
                      {active?.meta && <span className="text-[13px] text-faint">{active.meta}</span>}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Stepper: dots + arrows */}
              <div className="mt-8 flex items-center justify-center gap-5 lg:justify-start">
                <div className="flex items-center gap-[7px]">
                  {steps.map((s, i) => (
                    <motion.button
                      key={s.key}
                      onClick={() => select(i)}
                      aria-label={`Go to step ${i + 1}`}
                      animate={{ width: i === sel ? 24 : 8 }}
                      transition={SPRING}
                      className={`h-[8px] cursor-pointer rounded-full ${i === sel ? "bg-brand" : "bg-upcoming"}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2.5">
                  <motion.button
                    onClick={() => select(sel - 1)}
                    disabled={sel <= 0}
                    whileHover={sel <= 0 ? undefined : { scale: 1.08 }}
                    whileTap={sel <= 0 ? undefined : { scale: 0.92 }}
                    transition={SPRING_SOFT}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border border-edge text-[17px] text-ink ${
                      sel <= 0 ? "cursor-default opacity-35" : "cursor-pointer bg-card hover:border-brand"
                    }`}
                  >
                    ←
                  </motion.button>
                  <motion.button
                    onClick={() => select(sel + 1)}
                    disabled={sel >= n - 1}
                    whileHover={sel >= n - 1 ? undefined : { scale: 1.08 }}
                    whileTap={sel >= n - 1 ? undefined : { scale: 0.92 }}
                    transition={SPRING_SOFT}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border border-edge text-[17px] text-ink ${
                      sel >= n - 1 ? "cursor-default opacity-35" : "cursor-pointer bg-card hover:border-brand"
                    }`}
                  >
                    →
                  </motion.button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ── GROUP + GIVING ── */}
        <SectionReveal>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:mt-20">
            <Reveal>
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-wrap items-center justify-between gap-5 rounded-[22px] border border-edge bg-card/70 px-7 py-6 backdrop-blur"
              >
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[2px] text-faint">Your group</div>
                  <div className="mt-1.5 font-serif text-[24px] leading-[1.1]">{GROUP.name}</div>
                  <div className="mt-1 text-[13px] text-ink-soft">
                    {GROUP.nextMeeting} · {GROUP.host}
                  </div>
                </div>
                <motion.button
                  onClick={() => openCTA("Group Details")}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING_SOFT}
                  className="flex-none cursor-pointer rounded-full bg-brand px-6 py-3 text-[13.5px] font-bold text-on-accent"
                >
                  Details
                </motion.button>
              </motion.div>
            </Reveal>
            <Reveal delay={0.08}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-wrap items-center justify-between gap-5 rounded-[22px] border border-edge bg-card/70 px-7 py-6 backdrop-blur"
              >
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[2px] text-faint">Your giving · {GIVING.year}</div>
                  <div className="mt-1.5 flex items-baseline gap-2.5">
                    <CountUpCurrency value={GIVING.amount} className="font-serif text-[34px] leading-none tracking-[-1px]" />
                    <div className="text-[12.5px] text-ink-soft">{GIVING.gifts} gifts</div>
                  </div>
                </div>
                <motion.button
                  onClick={() => openCTA("Giving")}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING_SOFT}
                  className="flex-none cursor-pointer rounded-full bg-brand px-6 py-3 text-[13.5px] font-bold text-on-accent"
                >
                  Give again
                </motion.button>
              </motion.div>
            </Reveal>
          </div>

          {/* Sermon note + prayer requests */}
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Reveal>
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-col rounded-[22px] border border-edge bg-card/70 px-7 py-6 backdrop-blur"
              >
                <div className="text-[10.5px] font-bold uppercase tracking-[2px] text-faint">From Sunday</div>
                <p className="mt-3 font-serif text-[19px] italic leading-[1.5] text-ink-soft">
                  <span className="text-brand">“</span>
                  {SERMON.latestNote}
                  <span className="text-brand">”</span>
                </p>
                <motion.button
                  onClick={() => openCTA("Sermon Notes")}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING_SOFT}
                  className="mt-auto w-fit cursor-pointer rounded-full bg-brand px-6 py-3 text-[13.5px] font-bold text-on-accent"
                >
                  View all notes
                </motion.button>
              </motion.div>
            </Reveal>
            <Reveal delay={0.08}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_SOFT}
                className="flex h-full flex-col rounded-[22px] border border-edge bg-card/70 px-7 py-6 backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10.5px] font-bold uppercase tracking-[2px] text-faint">Prayer requests</div>
                  <div className="text-[11px] font-bold text-brand">{PRAYERS.length} active</div>
                </div>
                <div className="mt-3 flex flex-col">
                  {PRAYERS.map((p) => (
                    <div
                      key={p.text}
                      className="flex items-center justify-between gap-3 border-t border-hairline-soft py-2.5 first:border-t-0 first:pt-0"
                    >
                      <div className="text-[14px] leading-[1.3] text-ink">{p.text}</div>
                      <div className="flex flex-none items-center gap-1.5 text-[12px] text-ink-muted">
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
                  className="mt-4 w-fit cursor-pointer rounded-full border border-edge bg-transparent px-6 py-3 text-[13.5px] font-semibold text-ink-soft"
                >
                  Share a request
                </motion.button>
              </motion.div>
            </Reveal>
          </div>
        </SectionReveal>
      </div>
    </div>
  );
}
