"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { LayoutDashboard, Footprints, ListChecks, BookOpen, HandHeart, Users, Gift } from "lucide-react";
import type { ChurchConfig } from "@/lib/types";
import { getMemberProgress, type StepItem } from "@/lib/steps";
import { EASE, SPRING, SPRING_SOFT, CROSSFADE } from "@/lib/motion";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import CountUpCurrency from "@/components/CountUpCurrency";
import { useDemoCTA } from "@/context/DemoCTAContext";
import MemberMenu from "./shared/MemberMenu";

/**
 * Console — a signed-in software workspace, not a scrolling page.
 *
 * A persistent left sidebar (identity, section nav with a gliding active pill,
 * journey progress) sits beside a main canvas that swaps between sections
 * (Overview / Discipleship / Next steps / Group / Giving) with a crossfade. The
 * step sections are master-detail accordions. On mobile the sidebar collapses to
 * a horizontal nav strip above the canvas.
 *
 * Self-chromed (the sidebar IS the chrome; member dropdown lives in it). All
 * color from the injected palette tokens. Serif = the configured `font-serif`.
 */

const GROUP = {
  name: "Eastside Tuesday Group",
  host: "Marcus & Renee Hill",
  location: "Riverside Ave, Eastside",
  nextMeeting: "Tue, Jul 1 · 7:00 PM",
  members: ["M", "R", "J", "K", "T", "A"],
};
const GIVING = {
  year: "2026",
  amount: 1240,
  gifts: 14,
  gratitude: "Thank you — every gift went into people far from God finding their way home.",
  // Decorative monthly bars (0–1), purely visual.
  months: [0.3, 0.5, 0.4, 0.7, 0.55, 0.8, 0.6, 0.9, 0.7, 1, 0.75, 0.85],
};
const SERMON = {
  latestNote: "Grace didn't wait at the door — it ran down the road to meet him.",
};
const PRAYERS = [
  { text: "Healing for my dad's recovery", praying: 14 },
  { text: "Wisdom about a big decision", praying: 6 },
];

type SectionKey = "overview" | "track" | "next" | "sermon" | "prayer" | "group" | "giving";

function statusTag(s: StepItem): string {
  return s.completed ? "Completed" : s.inProgress ? "In progress" : "Upcoming";
}
function currentOf(steps: StepItem[]): StepItem | undefined {
  return steps.find((s) => s.inProgress) ?? steps.find((s) => !s.completed) ?? steps[0];
}

const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;

export default function MemberConsole({ config }: { config: ChurchConfig }) {
  const firstName = config.demoMember.firstName;
  const openCTA = useDemoCTA();

  const { discipleshipSteps, nextSteps } = getMemberProgress(config);
  const hasNext = nextSteps.length > 0;
  const allSteps = [...discipleshipSteps, ...nextSteps];
  const total = allSteps.length;
  const done = allSteps.filter((s) => s.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const current = currentOf(discipleshipSteps);

  const nav = useMemo(
    () =>
      [
        { key: "overview" as const, label: "Overview", icon: LayoutDashboard },
        { key: "track" as const, label: "Discipleship", icon: Footprints },
        hasNext ? { key: "next" as const, label: "Next steps", icon: ListChecks } : null,
        { key: "sermon" as const, label: "Sermon notes", icon: BookOpen },
        { key: "prayer" as const, label: "Prayer", icon: HandHeart },
        { key: "group" as const, label: "Group", icon: Users },
        { key: "giving" as const, label: "Giving", icon: Gift },
      ].filter(Boolean) as { key: SectionKey; label: string; icon: typeof Users }[],
    [hasNext],
  );

  const [section, setSection] = useState<SectionKey>("overview");
  const [openStep, setOpenStep] = useState<string | null>(current?.key ?? null);

  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => {
    const h = new Date().getHours();
    const word = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    setGreeting(`${word} · ${date}`);
  }, []);

  const sectionTitle = nav.find((n) => n.key === section)?.label ?? "Overview";

  return (
    <div className="relative min-h-screen bg-paper text-ink lg:flex">
      {/* ── SIDEBAR (desktop) ── */}
      <aside className="sticky top-0 z-40 hidden h-screen w-[290px] shrink-0 flex-col border-r border-edge bg-card/60 px-5 py-7 backdrop-blur lg:flex">
        <SectionReveal>
          <Reveal>
            <div className="flex items-center gap-3">
              {config.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.logoUrl}
                  alt=""
                  className="h-[42px] w-auto max-w-[170px] flex-none object-contain [filter:var(--logo-filter)]"
                />
              ) : (
                <div className="flex h-[40px] w-[40px] flex-none items-center justify-center rounded-[12px] bg-brand font-serif text-[21px] font-semibold text-on-accent">
                  {config.churchName.charAt(0)}
                </div>
              )}
              <div className="min-w-0 leading-tight">
                <div className="truncate font-serif text-[17px] font-semibold">{config.churchName}</div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[2px] text-faint">Member portal</div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <LayoutGroup>
              <nav className="mt-9 flex flex-col gap-1">
                {nav.map((n) => {
                  const Icon = n.icon;
                  const isActive = n.key === section;
                  return (
                    <button
                      key={n.key}
                      onClick={() => setSection(n.key)}
                      className={`relative flex cursor-pointer items-center gap-3 rounded-[12px] px-3.5 py-[11px] text-left text-[14px] font-semibold transition-colors ${
                        isActive ? "text-ink" : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="ws-active-d"
                          transition={SPRING}
                          className="absolute inset-0 rounded-[12px] border border-edge bg-card shadow-[0_6px_18px_-12px_rgba(20,12,6,0.5)]"
                        />
                      )}
                      <Icon className={`relative z-10 h-[18px] w-[18px] ${isActive ? "text-brand" : ""}`} strokeWidth={2} />
                      <span className="relative z-10">{n.label}</span>
                    </button>
                  );
                })}
              </nav>
            </LayoutGroup>
          </Reveal>

          {/* Progress block */}
          <Reveal delay={0.16}>
            <div className="mt-9 rounded-[16px] border border-edge bg-card-2 p-4">
              <div className="flex items-center gap-3.5">
                <div className="relative h-16 w-16 flex-none">
                  <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                    <circle cx="32" cy="32" r={RING_R} fill="none" className="stroke-upcoming" strokeWidth="6" />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r={RING_R}
                      fill="none"
                      className="stroke-brand"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={RING_C.toFixed(1)}
                      initial={{ strokeDashoffset: RING_C }}
                      animate={{ strokeDashoffset: RING_C * (1 - pct / 100) }}
                      transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-serif text-[16px]">{pct}%</div>
                </div>
                <div className="leading-tight">
                  <div className="text-[10px] font-bold uppercase tracking-[1.6px] text-faint">Your journey</div>
                  <div className="mt-0.5 font-serif text-[18px]">
                    {done}/{total} steps
                  </div>
                  <div className="text-[12px] text-ink-muted">{total - done} to go</div>
                </div>
              </div>
            </div>
          </Reveal>
        </SectionReveal>

        {/* Member control pinned to the bottom */}
        <div className="mt-auto pt-6">
          <MemberMenu
            config={config}
            align="left"
            placement="up"
            triggerClassName="flex w-full cursor-pointer items-center gap-3 rounded-[12px] border border-edge bg-card px-3 py-2.5 text-left"
          />
        </div>
      </aside>

      {/* ── MAIN CANVAS ── */}
      <main className="min-w-0 flex-1">
        {/* Mobile top chrome: brand + member, then a horizontal nav strip */}
        <div className="sticky top-0 z-40 border-b border-edge bg-card/80 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {config.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.logoUrl} alt="" className="h-9 w-auto max-w-[140px] flex-none object-contain [filter:var(--logo-filter)]" />
              ) : (
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand font-serif text-[17px] font-semibold text-on-accent">
                  {config.churchName.charAt(0)}
                </div>
              )}
              <div className="truncate font-serif text-[15px] font-semibold">{config.churchName}</div>
            </div>
            <MemberMenu config={config} />
          </div>
          <LayoutGroup>
            <div className="flex gap-1 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none]">
              {nav.map((n) => {
                const isActive = n.key === section;
                return (
                  <button
                    key={n.key}
                    onClick={() => setSection(n.key)}
                    className={`relative shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                      isActive ? "text-on-accent" : "text-ink-soft"
                    }`}
                  >
                    {isActive && (
                      <motion.span layoutId="ws-active-m" transition={SPRING} className="absolute inset-0 rounded-full bg-brand" />
                    )}
                    <span className="relative z-10">{n.label}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        {/* Canvas header */}
        <div className="hidden items-end justify-between gap-4 border-b border-edge px-8 py-5 lg:flex">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[2.4px] text-brand">{greeting ?? " "}</div>
            <h1 className="mt-1 font-serif text-[26px] font-semibold leading-none">{sectionTitle}</h1>
          </div>
          <div className="text-right text-[12.5px] text-ink-muted">
            Signed in as <span className="font-semibold text-ink">{firstName}</span>
          </div>
        </div>

        {/* Swappable section content */}
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[860px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={CROSSFADE}
              >
                {section === "overview" && (
                  <Overview
                    firstName={firstName}
                    welcomeLine={config.welcomeLine}
                    current={current}
                    pct={pct}
                    done={done}
                    total={total}
                    onCTA={openCTA}
                    onGoto={setSection}
                    hasNext={hasNext}
                  />
                )}
                {section === "track" && (
                  <StepList
                    label="Discipleship track"
                    steps={discipleshipSteps}
                    openStep={openStep}
                    setOpenStep={setOpenStep}
                    onCTA={openCTA}
                  />
                )}
                {section === "next" && (
                  <StepList
                    label="Next steps"
                    steps={nextSteps}
                    openStep={openStep}
                    setOpenStep={setOpenStep}
                    onCTA={openCTA}
                  />
                )}
                {section === "sermon" && <SermonPanel onCTA={openCTA} />}
                {section === "prayer" && <PrayerPanel onCTA={openCTA} />}
                {section === "group" && <GroupPanel onCTA={openCTA} />}
                {section === "giving" && <GivingPanel onCTA={openCTA} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Section: Overview ──────────────────────────────────────────────────────
function Overview({
  firstName,
  welcomeLine,
  current,
  pct,
  done,
  total,
  onCTA,
  onGoto,
  hasNext,
}: {
  firstName: string;
  welcomeLine?: string;
  current?: StepItem;
  pct: number;
  done: number;
  total: number;
  onCTA: () => void;
  onGoto: (k: SectionKey) => void;
  hasNext: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-[34px] font-medium leading-[1.05] tracking-[-.5px] sm:text-[40px]">
          Welcome back, <span className="italic text-brand">{firstName}.</span>
        </h2>
        {welcomeLine && <p className="mt-3 max-w-[560px] text-[16px] leading-[1.55] text-ink-soft">{welcomeLine}</p>}
      </div>

      {/* Continue card */}
      {current && (
        <motion.div
          whileHover={{ y: -3 }}
          transition={SPRING_SOFT}
          className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(150deg,_rgb(var(--brand)),_rgb(var(--brand-card)))] px-7 py-7 text-on-accent shadow-[0_22px_50px_-26px_rgb(var(--brand-card)_/_0.7)]"
        >
          <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-[radial-gradient(circle,_rgba(255,220,205,0.22),_transparent_70%)]" />
          <div className="relative">
            <div className="text-[10.5px] font-extrabold tracking-[2.2px] text-on-accent/70">CONTINUE WHERE YOU LEFT OFF</div>
            <div className="mt-2.5 font-serif text-[28px] leading-[1.1]">{current.label}</div>
            {current.description && (
              <p className="mt-2.5 max-w-[520px] text-[14.5px] leading-[1.5] text-on-accent/80">{current.description}</p>
            )}
            <motion.button
              onClick={onCTA}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={SPRING_SOFT}
              className="mt-5 cursor-pointer rounded-[11px] bg-accent-btn px-5 py-3 text-[14px] font-bold text-accent-btn-ink"
            >
              {(current.ctaLabel ?? "Get started")} →
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Journey complete" value={`${pct}%`} />
        <Stat label="Steps done" value={`${done} / ${total}`} />
        <Stat label="Still to come" value={`${total - done}`} />
      </div>

      {/* Quick jumps */}
      <div className="rounded-[20px] border border-edge bg-card p-5">
        <div className="text-[10.5px] font-bold uppercase tracking-[2px] text-faint">Jump to</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Jump label="Your discipleship track" onClick={() => onGoto("track")} />
          {hasNext && <Jump label="Next steps" onClick={() => onGoto("next")} />}
          <Jump label="Sermon notes" onClick={() => onGoto("sermon")} />
          <Jump label="Prayer requests" onClick={() => onGoto("prayer")} />
          <Jump label="Your group" onClick={() => onGoto("group")} />
          <Jump label="Your giving" onClick={() => onGoto("giving")} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-edge bg-card px-5 py-[18px]">
      <div className="text-[10px] font-bold uppercase tracking-[1.6px] text-faint">{label}</div>
      <div className="mt-1.5 font-serif text-[30px] leading-none">{value}</div>
    </div>
  );
}

function Jump({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer rounded-full border border-edge bg-card-2 px-4 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
    >
      {label} →
    </button>
  );
}

// ── Section: a master-detail step accordion ────────────────────────────────
function StepList({
  label,
  steps,
  openStep,
  setOpenStep,
  onCTA,
}: {
  label: string;
  steps: StepItem[];
  openStep: string | null;
  setOpenStep: (k: string | null) => void;
  onCTA: () => void;
}) {
  const done = steps.filter((s) => s.completed).length;
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[24px] font-semibold">{label}</h2>
        <div className="text-[12.5px] font-semibold text-ink-muted">
          {done}/{steps.length} complete
        </div>
      </div>
      <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-upcoming">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${steps.length ? (done / steps.length) * 100 : 0}%` }}
          transition={{ duration: 0.9, ease: EASE }}
          className="h-full rounded-full bg-brand"
        />
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {steps.map((s, i) => {
          const isOpen = s.key === openStep;
          return (
            <motion.div
              key={s.key}
              layout
              transition={SPRING}
              className={`overflow-hidden rounded-[16px] border transition-colors ${
                isOpen ? "border-brand/30 bg-brand/[0.04]" : "border-edge bg-card hover:border-line-hover"
              }`}
            >
              <button
                onClick={() => setOpenStep(isOpen ? null : s.key)}
                className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-left"
              >
                {s.completed ? (
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand">
                    <span className="text-[13px] leading-none text-on-accent">✓</span>
                  </div>
                ) : s.inProgress ? (
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full border-[2.5px] border-brand bg-card animate-[bnPulse_2.6s_ease-in-out_infinite]">
                    <div className="h-2 w-2 rounded-full bg-brand" />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 border-upcoming bg-card-2">
                    <span className="text-[11px] font-bold text-faint">{i + 1}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className={`text-[15px] leading-tight ${s.inProgress ? "font-bold" : "font-semibold"}`}>{s.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-faint">{statusTag(s)}</div>
                </div>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={SPRING_SOFT} className="text-[12px] text-faint">
                  ▾
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pl-[58px]">
                      {s.description && <p className="text-[14px] leading-[1.55] text-ink-soft">{s.description}</p>}
                      <div className="mt-3.5 flex flex-wrap items-center gap-3">
                        <motion.button
                          onClick={onCTA}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={SPRING_SOFT}
                          className="cursor-pointer rounded-[10px] bg-brand px-5 py-2.5 text-[13.5px] font-bold text-on-accent"
                        >
                          {(s.ctaLabel ?? (s.completed ? "Revisit" : "Get started"))} →
                        </motion.button>
                        {s.meta && <span className="text-[12.5px] text-faint">{s.meta}</span>}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section: Sermon notes ──────────────────────────────────────────────────
function SermonPanel({ onCTA }: { onCTA: () => void }) {
  return (
    <div className="rounded-[22px] border border-edge bg-card px-7 py-7">
      <div className="text-[10.5px] font-bold uppercase tracking-[2px] text-faint">From Sunday</div>
      <h2 className="mt-2 font-serif text-[26px] font-semibold leading-[1.1]">Sermon notes</h2>
      <div className="mt-5 rounded-[16px] bg-card-2 px-5 py-5">
        <div className="text-[10px] font-bold uppercase tracking-[1.6px] text-faint">Your latest note</div>
        <p className="mt-2.5 font-serif text-[19px] italic leading-[1.5] text-ink-soft">
          <span className="text-brand">“</span>
          {SERMON.latestNote}
          <span className="text-brand">”</span>
        </p>
      </div>
      <motion.button
        onClick={onCTA}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={SPRING_SOFT}
        className="mt-6 w-full cursor-pointer rounded-[11px] bg-ink py-3 text-[14px] font-bold text-paper"
      >
        View all notes
      </motion.button>
    </div>
  );
}

// ── Section: Prayer requests ───────────────────────────────────────────────
function PrayerPanel({ onCTA }: { onCTA: () => void }) {
  return (
    <div className="rounded-[22px] border border-edge bg-card px-7 py-7">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[24px] font-semibold">Prayer requests</h2>
        <div className="rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold text-brand">{PRAYERS.length} active</div>
      </div>
      <div className="mt-4 flex flex-col">
        {PRAYERS.map((p) => (
          <div
            key={p.text}
            className="flex items-center justify-between gap-3 border-t border-hairline-soft py-3.5 first:border-t-0 first:pt-0"
          >
            <div className="text-[15px] leading-[1.3] text-ink">{p.text}</div>
            <div className="flex flex-none items-center gap-1.5 text-[12.5px] text-ink-muted">
              <span className="text-brand">♥</span> {p.praying} praying
            </div>
          </div>
        ))}
      </div>
      <motion.button
        onClick={onCTA}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={SPRING_SOFT}
        className="mt-6 w-full cursor-pointer rounded-[11px] border border-edge bg-transparent py-3 text-[14px] font-semibold text-ink-soft"
      >
        Share a request
      </motion.button>
    </div>
  );
}

// ── Section: Group ─────────────────────────────────────────────────────────
function GroupPanel({ onCTA }: { onCTA: () => void }) {
  return (
    <div className="rounded-[22px] border border-edge bg-card px-7 py-7">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] font-bold uppercase tracking-[2px] text-faint">Your community group</div>
        <div className="rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold text-brand">Active</div>
      </div>
      <div className="mt-3 font-serif text-[30px] leading-[1.1]">{GROUP.name}</div>
      <div className="mt-1.5 text-[14px] text-ink-soft">
        Hosted by {GROUP.host} · {GROUP.location}
      </div>

      <div className="mt-6 flex items-center gap-2">
        {GROUP.members.map((m, i) => (
          <div
            key={i}
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-card-2 text-[12px] font-bold text-ink-soft"
            style={{ marginLeft: i === 0 ? 0 : -10 }}
          >
            {m}
          </div>
        ))}
        <span className="ml-2 text-[13px] text-ink-muted">+ you</span>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-[14px] bg-card-2 px-5 py-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[1.6px] text-faint">Next meeting</div>
          <div className="mt-0.5 text-[15px] font-bold">{GROUP.nextMeeting}</div>
        </div>
        <motion.button
          onClick={onCTA}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING_SOFT}
          className="cursor-pointer rounded-[11px] bg-brand px-5 py-2.5 text-[13.5px] font-bold text-on-accent"
        >
          Details →
        </motion.button>
      </div>
    </div>
  );
}

// ── Section: Giving ────────────────────────────────────────────────────────
function GivingPanel({ onCTA }: { onCTA: () => void }) {
  return (
    <div className="rounded-[22px] border border-edge bg-card px-7 py-7">
      <div className="text-[10.5px] font-bold uppercase tracking-[2px] text-faint">Your giving · {GIVING.year}</div>
      <div className="mt-3 flex items-baseline gap-3">
        <CountUpCurrency value={GIVING.amount} className="font-serif text-[48px] leading-none tracking-[-1px]" />
        <div className="text-[13.5px] text-ink-soft">{GIVING.gifts} gifts</div>
      </div>

      {/* Decorative monthly bars */}
      <div className="mt-6 flex h-24 items-end gap-1.5">
        {GIVING.months.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(8, h * 100)}%` }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.04 }}
            className="flex-1 rounded-t-[4px] bg-brand/30"
          />
        ))}
      </div>

      <p className="mt-6 max-w-[460px] font-serif text-[15px] italic leading-[1.5] text-ink-soft">{GIVING.gratitude}</p>

      <div className="mt-6 flex gap-2.5">
        <motion.button
          onClick={onCTA}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING_SOFT}
          className="cursor-pointer rounded-[11px] bg-brand px-6 py-3 text-[14px] font-bold text-on-accent"
        >
          Give again
        </motion.button>
        <motion.button
          onClick={onCTA}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING_SOFT}
          className="cursor-pointer rounded-[11px] border border-edge bg-transparent px-5 py-3 text-[14px] font-semibold text-ink-soft"
        >
          Statement
        </motion.button>
      </div>
    </div>
  );
}
