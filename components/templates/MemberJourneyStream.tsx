"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";
import type { ChurchConfig } from "@/lib/types";
import { getMemberProgress, type StepItem } from "@/lib/steps";
import { EASE, SPRING_SOFT } from "@/lib/motion";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import CountUpCurrency from "@/components/CountUpCurrency";
import { useDemoCTA } from "@/context/DemoCTAContext";
import MemberMenu from "./shared/MemberMenu";

/**
 * Stream — a cinematic, scroll-driven member journey.
 *
 * Radically un-dashboard: instead of a grid of cards, the whole journey is one
 * tall vertical story. A full-bleed hero opens it, then each step is a full-width
 * "chapter" that reveals as you scroll. A sticky rail on the left tracks where
 * you are and fills as you move down; clicking a rail node glides you to that
 * chapter. Group + giving close the story as final chapters.
 *
 * Self-chromed (own header + shared member dropdown). All color from the injected
 * palette tokens, so it adapts to light/dark. Serif = the configured `font-serif`.
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

type Chapter = StepItem & { group: "track" | "next"; n: number };

function statusTag(s: StepItem): string {
  return s.completed ? "COMPLETED" : s.inProgress ? "YOU'RE HERE" : "COMING UP";
}

export default function MemberJourneyStream({ config }: { config: ChurchConfig }) {
  const firstName = config.demoMember.firstName;
  const openCTA = useDemoCTA();

  const { discipleshipSteps, nextSteps } = getMemberProgress(config);
  const allSteps = [...discipleshipSteps, ...nextSteps];
  const total = allSteps.length;
  const done = allSteps.filter((s) => s.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // Flatten into globally-numbered chapters, tagged by which list they came from
  // so we can drop a section divider where the track gives way to next steps.
  const chapters = useMemo<Chapter[]>(
    () => [
      ...discipleshipSteps.map((s, i) => ({ ...s, group: "track" as const, n: i + 1 })),
      ...nextSteps.map((s, i) => ({ ...s, group: "next" as const, n: discipleshipSteps.length + i + 1 })),
    ],
    [discipleshipSteps, nextSteps],
  );

  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => {
    const h = new Date().getHours();
    const word = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    setGreeting(`${word} · ${date}`);
  }, []);

  // A ref per chapter so the hero's "scroll to continue" can glide to the first
  // unfinished one.
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const scrollToChapter = (i: number) =>
    chapterRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="relative min-h-screen overflow-x-clip bg-paper text-ink">
      {/* Ambient brand glow drifting behind the story */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -right-[12%] -top-[16%] h-[60vw] w-[60vw] rounded-full bg-[radial-gradient(circle,_rgb(var(--brand)_/_0.12),_transparent_66%)] blur-[46px] animate-[edDrift1_30s_ease-in-out_infinite]" />
        <div className="absolute -bottom-[18%] -left-[14%] h-[56vw] w-[56vw] rounded-full bg-[radial-gradient(circle,_rgb(var(--brand)_/_0.08),_transparent_70%)] blur-[52px] animate-[edDrift2_36s_ease-in-out_infinite]" />
      </div>

      {/* ── HEADER ── */}
      <div className="relative z-[2] mx-auto max-w-[1180px] px-5 sm:px-8">
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
                  <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-brand font-serif text-[21px] font-semibold text-on-accent">
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
      </div>

      {/* ── HERO ── a full, cinematic opening */}
      <div className="relative z-[2] mx-auto flex min-h-[78vh] max-w-[1180px] flex-col justify-center px-5 pb-16 pt-6 sm:px-8 lg:min-h-[82vh]">
        <SectionReveal>
          <SubheadingReveal
            delay={0.35}
            className="min-h-[16px] text-[12px] font-bold uppercase tracking-[3px] text-brand"
          >
            {greeting ?? " "}
          </SubheadingReveal>
          <h1 className="mt-4 font-serif text-[clamp(44px,9vw,104px)] font-medium leading-[0.98] tracking-[-1.5px]">
            <HeadingReveal as="span" className="block">
              Welcome back,
            </HeadingReveal>
            <HeadingReveal as="span" delay={0.16} className="block italic text-brand">
              {`${firstName}.`}
            </HeadingReveal>
          </h1>
          {config.welcomeLine && (
            <ParagraphReveal delay={0.5} className="mt-6 max-w-[560px] text-[18px] leading-[1.55] text-ink-soft">
              {config.welcomeLine}
            </ParagraphReveal>
          )}

          {/* Hero progress: a thin line that fills to the journey percentage */}
          <Reveal delay={0.62} className="mt-10 max-w-[560px]">
            <div className="flex items-baseline justify-between">
              <div className="text-[13px] font-semibold tracking-[1.5px] text-faint">
                YOUR JOURNEY · {done} OF {total}
              </div>
              <div className="font-serif text-[22px] text-brand">{pct}%</div>
            </div>
            <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-upcoming">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.3, ease: EASE, delay: 0.8 }}
                className="h-full rounded-full bg-brand"
              />
            </div>
          </Reveal>

          <Reveal delay={0.8} className="mt-12">
            <button
              onClick={() => scrollToChapter(Math.max(0, chapters.findIndex((c) => !c.completed)))}
              className="group inline-flex cursor-pointer items-center gap-3 text-[13px] font-semibold tracking-[1.5px] text-ink-muted transition-colors hover:text-ink"
            >
              <span>SCROLL TO CONTINUE</span>
              <motion.span
                aria-hidden
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                className="text-[15px]"
              >
                ↓
              </motion.span>
            </button>
          </Reveal>
        </SectionReveal>
      </div>

      {/* ── STORY: rail + chapters ── */}
      <div className="relative z-[2] mx-auto max-w-[1180px] px-5 sm:px-8">
        {chapters.map((c, i) => {
          const showDivider = i > 0 && c.group === "next" && chapters[i - 1].group === "track";
          const contentLeft = i % 2 === 0;
          const lineColor = c.completed ? "bg-brand" : "bg-upcoming";

          const content = (
            <div className={contentLeft ? "lg:text-right" : ""}>
              <Reveal>
                <div className={`flex items-baseline gap-4 ${contentLeft ? "lg:justify-end" : ""}`}>
                  <span className="font-serif text-[clamp(44px,7vw,84px)] font-medium leading-none text-brand/15">
                    {String(c.n).padStart(2, "0")}
                  </span>
                  <span
                    className={`text-[11px] font-bold tracking-[2.4px] ${
                      c.completed || c.inProgress ? "text-brand" : "text-faint"
                    }`}
                  >
                    {statusTag(c)}
                  </span>
                </div>
              </Reveal>
              <HeadingReveal
                as="h2"
                className="mt-3 font-serif text-[clamp(28px,3.4vw,44px)] font-medium leading-[1.06] tracking-[-.5px]"
              >
                {c.label}
              </HeadingReveal>
              {c.description && (
                <ParagraphReveal
                  delay={0.1}
                  className={`mt-4 text-[16px] leading-[1.6] text-ink-soft lg:max-w-[440px] ${
                    contentLeft ? "lg:ml-auto" : ""
                  }`}
                >
                  {c.description}
                </ParagraphReveal>
              )}
              <Reveal delay={0.16}>
                <div className={`mt-6 flex flex-wrap items-center gap-4 ${contentLeft ? "lg:justify-end" : ""}`}>
                  <motion.button
                    onClick={() => openCTA(c.label)}
                    whileHover={{ y: -2, boxShadow: "0 14px 30px -10px rgb(var(--brand) / 0.5)" }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_SOFT}
                    className="cursor-pointer rounded-full bg-brand px-7 py-[14px] text-[14px] font-bold text-on-accent"
                  >
                    {(c.ctaLabel ?? (c.completed ? "Revisit" : "Get started"))} →
                  </motion.button>
                  {c.meta && <span className="text-[13px] text-faint">{c.meta}</span>}
                </div>
              </Reveal>
            </div>
          );

          // Placeholder for a church photo on the side opposite the content.
          const image = (
            <Reveal delay={0.08}>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[24px] border border-edge bg-[linear-gradient(150deg,_var(--card),_var(--card-2))]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,_rgb(var(--brand)/0.14),_transparent_60%)]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-faint">
                  <ImageIcon className="h-9 w-9" strokeWidth={1.5} />
                  <span className="text-[11px] font-semibold uppercase tracking-[2.5px]">Photo</span>
                </div>
              </div>
            </Reveal>
          );

          return (
            <div key={c.key}>
              {showDivider && (
                <Reveal className="py-8 lg:py-10">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-hairline-soft" />
                    <div className="text-[11px] font-bold uppercase tracking-[3px] text-faint">
                      And next, a few invitations
                    </div>
                    <div className="h-px flex-1 bg-hairline-soft" />
                  </div>
                </Reveal>
              )}
              <section
                ref={(el) => {
                  chapterRefs.current[i] = el;
                }}
                className={`relative border-t border-hairline-soft ${
                  c.inProgress
                    ? "before:absolute before:inset-x-[-100vw] before:inset-y-0 before:-z-10 before:bg-[rgb(var(--brand)/0.045)]"
                    : ""
                }`}
              >
                {/* Desktop: content one side, photo the other, a progress spine between.
                    Mobile: the spine drops out and the two cells simply stack. */}
                <div className="grid items-center gap-7 py-12 lg:grid-cols-[1fr_64px_1fr] lg:gap-10 lg:py-20">
                  <div>{contentLeft ? content : image}</div>
                  <div className="relative hidden self-stretch lg:block">
                    <div className={`absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 ${lineColor}`} />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      {c.completed ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand shadow-[0_2px_10px_rgb(var(--brand)/0.4)]">
                          <span className="text-[14px] leading-none text-on-accent">✓</span>
                        </div>
                      ) : c.inProgress ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] border-brand bg-card animate-[bnPulse_2.6s_ease-in-out_infinite]">
                          <div className="h-2.5 w-2.5 rounded-full bg-brand" />
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-upcoming bg-card">
                          <span className="text-[12px] font-bold text-faint">{c.n}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>{contentLeft ? image : content}</div>
                </div>
              </section>
            </div>
          );
        })}

            {/* ── Chapter: Sunday's sermon note (editorial pull-quote) ── */}
            <section className="border-t border-hairline-soft py-16 lg:py-[88px]">
              <Reveal>
                <div className="text-[11px] font-bold uppercase tracking-[3px] text-faint">From Sunday</div>
              </Reveal>
              <Reveal delay={0.06}>
                <figure className="mt-7 max-w-[840px]">
                  <blockquote className="font-serif text-[clamp(26px,4.4vw,46px)] font-medium italic leading-[1.16] text-ink">
                    <span className="text-brand">“</span>
                    {SERMON.latestNote}
                    <span className="text-brand">”</span>
                  </blockquote>
                  <figcaption className="mt-7 flex flex-wrap items-center gap-5">
                    <span className="text-[12px] font-bold tracking-[1.8px] text-faint">YOUR LATEST SERMON NOTE</span>
                    <motion.button
                      onClick={() => openCTA("Sermon Notes")}
                      whileHover={{ y: -2, boxShadow: "0 14px 30px -10px rgb(var(--brand) / 0.5)" }}
                      whileTap={{ scale: 0.98 }}
                      transition={SPRING_SOFT}
                      className="cursor-pointer rounded-full bg-brand px-6 py-3 text-[13.5px] font-bold text-on-accent"
                    >
                      View all notes →
                    </motion.button>
                  </figcaption>
                </figure>
              </Reveal>
            </section>

            {/* ── Chapter: prayers lifted together ── */}
            <section className="border-t border-hairline-soft py-16 lg:py-[88px]">
              <Reveal>
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-[3px] text-faint">Lifted up together</div>
                  <div className="text-[12px] font-semibold text-brand">{PRAYERS.length} active</div>
                </div>
              </Reveal>
              <div className="mt-6 max-w-[760px]">
                {PRAYERS.map((p, i) => (
                  <Reveal key={p.text} delay={0.05 * i}>
                    <div className="flex items-center justify-between gap-5 border-t border-hairline-soft py-5 first:border-t-0">
                      <div className="font-serif text-[clamp(19px,2.8vw,26px)] leading-[1.25]">{p.text}</div>
                      <div className="flex flex-none items-center gap-1.5 text-[13px] text-ink-muted">
                        <span className="text-brand">♥</span> {p.praying} praying
                      </div>
                    </div>
                  </Reveal>
                ))}
                <Reveal delay={0.12}>
                  <motion.button
                    onClick={() => openCTA("Prayer Requests")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_SOFT}
                    className="mt-7 cursor-pointer rounded-full border border-edge bg-transparent px-6 py-3 text-[13.5px] font-semibold text-ink-soft transition-colors hover:text-ink"
                  >
                    Share a request →
                  </motion.button>
                </Reveal>
              </div>
            </section>

            {/* ── Closing chapters: group + giving ── */}
            <section className="border-t border-hairline-soft py-16 lg:py-[88px]">
              <Reveal>
                <div className="text-[11px] font-bold uppercase tracking-[3px] text-faint">Your people</div>
              </Reveal>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <Reveal delay={0.06}>
                  <motion.div
                    whileHover={{ y: -3 }}
                    transition={SPRING_SOFT}
                    className="h-full rounded-[22px] border border-edge bg-card px-7 py-7"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[10.5px] font-bold tracking-[2px] text-faint">YOUR GROUP</div>
                      <div className="text-[11px] font-bold text-brand">Active</div>
                    </div>
                    <div className="mt-3 font-serif text-[26px] leading-[1.1]">{GROUP.name}</div>
                    <div className="mt-1 text-[13.5px] text-ink-soft">Hosted by {GROUP.host}</div>
                    <div className="mt-5 flex items-center justify-between border-t border-hairline-soft pt-4">
                      <div>
                        <div className="text-[10px] font-bold tracking-[1.4px] text-faint">NEXT MEETING</div>
                        <div className="mt-0.5 text-[14px] font-bold">{GROUP.nextMeeting}</div>
                      </div>
                      <button
                        onClick={() => openCTA("Group Details")}
                        className="cursor-pointer text-[13px] font-bold text-brand transition-transform hover:translate-x-0.5"
                      >
                        Details →
                      </button>
                    </div>
                  </motion.div>
                </Reveal>
                <Reveal delay={0.12}>
                  <motion.div
                    whileHover={{ y: -3 }}
                    transition={SPRING_SOFT}
                    className="flex h-full flex-col justify-between rounded-[22px] border border-edge bg-card px-7 py-7"
                  >
                    <div>
                      <div className="text-[10.5px] font-bold tracking-[2px] text-faint">YOUR GIVING · {GIVING.year}</div>
                      <div className="mt-3 flex items-baseline gap-2.5">
                        <CountUpCurrency value={GIVING.amount} className="font-serif text-[44px] leading-none tracking-[-1px]" />
                        <div className="text-[13px] text-ink-soft">{GIVING.gifts} gifts</div>
                      </div>
                      <p className="mt-4 max-w-[380px] font-serif text-[15px] italic leading-[1.45] text-ink-soft">
                        {GIVING.gratitude}
                      </p>
                    </div>
                    <div className="mt-6 flex gap-2.5">
                      <motion.button
                        onClick={() => openCTA("Giving")}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={SPRING_SOFT}
                        className="cursor-pointer rounded-full bg-brand px-6 py-[13px] text-[14px] font-bold text-on-accent"
                      >
                        Give again
                      </motion.button>
                      <motion.button
                        onClick={() => openCTA("Giving")}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={SPRING_SOFT}
                        className="cursor-pointer rounded-full border border-edge bg-transparent px-5 py-[13px] text-[14px] font-semibold text-ink-soft"
                      >
                        Statement
                      </motion.button>
                    </div>
                  </motion.div>
                </Reveal>
              </div>
            </section>

            {/* Outro */}
            <section className="border-t border-hairline-soft py-20 text-center lg:py-28">
              <Reveal>
                <div className="font-serif text-[clamp(28px,4.5vw,46px)] font-medium leading-[1.1]">
                  The story isn{"’"}t finished, <span className="italic text-brand">{firstName}</span>.
                </div>
                <p className="mx-auto mt-4 max-w-[440px] text-[16px] leading-[1.55] text-ink-soft">
                  There{"’"}s always a next step — and people walking it with you.
                </p>
                <motion.button
                  onClick={() => openCTA(chapters.find((ch) => !ch.completed)?.label)}
                  whileHover={{ y: -2, boxShadow: "0 16px 34px -12px rgb(var(--brand) / 0.55)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING_SOFT}
                  className="mt-8 cursor-pointer rounded-full bg-brand px-8 py-4 text-[15px] font-bold text-on-accent"
                >
                  See what{"’"}s next →
                </motion.button>
              </Reveal>
            </section>
      </div>
    </div>
  );
}
