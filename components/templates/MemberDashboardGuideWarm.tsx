"use client";

import { useEffect, useState } from "react";
import type { ChurchConfig } from "@/lib/types";
import { getMemberProgress, type StepItem } from "@/lib/steps";

/**
 * Warm Guide member dashboard — React/Tailwind port of `dashboard-warm-guide`.
 * A discipleship-track ladder beside a brand-colored "next step" deck you
 * advance with arrows. Hardcoded group + giving below.
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
  amount: "$1,240",
  gifts: 14,
  gratitude: "Thank you — every gift finds its way home.",
};

const RING_R = 43;
const RING_C = 2 * Math.PI * RING_R;
const DECK_TAGS = ["DO THIS NEXT", "THEN", "AFTER THAT"];

function statusLabel(s: StepItem): string {
  return s.completed ? "Completed" : s.inProgress ? "You're here" : "Upcoming";
}

export default function MemberDashboardGuideWarm({ config }: { config: ChurchConfig }) {
  const { demoMember } = config;
  const firstName = demoMember.firstName;

  const { discipleshipSteps: steps } = getMemberProgress(config);
  const total = steps.length;
  const done = steps.filter((s) => s.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const ringOffset = RING_C * (1 - pct / 100);
  const current = steps.find((s) => s.inProgress);
  const deck = steps.filter((s) => !s.completed);

  const [deckIndex, setDeckIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => {
    const h = new Date().getHours();
    const word = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    setGreeting(`${word} · ${date}`);
  }, []);

  const di = Math.min(deckIndex, Math.max(0, deck.length - 1));
  const card = deck[di];
  const atStart = di <= 0;
  const atEnd = di >= deck.length - 1;

  return (
    <div className="relative min-h-screen bg-[radial-gradient(1000px_440px_at_20%_-8%,_rgb(var(--brand)_/_0.10),_transparent_60%),var(--paper)] px-10 pt-7 pb-[70px] text-ink">
      <div className="mx-auto max-w-[1100px]">
        {/* ── HEADER ── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-brand font-serif text-[20px] font-semibold text-on-accent">
              {config.churchName.charAt(0)}
            </div>
            <div className="font-serif text-[19px] font-semibold">{config.churchName}</div>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex cursor-pointer items-center gap-2.5 rounded-full border border-edge bg-card py-1.5 pl-[14px] pr-[9px]"
            >
              <div className="text-[13px] font-bold">{firstName}</div>
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-edge bg-card-2 text-[13px] font-bold text-ink-soft">
                {firstName.charAt(0)}
              </div>
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40" />
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[322px] overflow-hidden rounded-[18px] border border-edge bg-card shadow-[0_30px_64px_-26px_rgba(20,12,8,0.4)]">
                  <div className="bg-card-2 px-5 pb-[15px] pt-[18px]">
                    <div className="text-[9.5px] font-extrabold tracking-[2.2px] text-brand">YOUR NEXT STEP</div>
                    <div className="mt-[5px] font-serif text-[22px] leading-[1.12]">{current?.label ?? ""}</div>
                  </div>
                  <div className="h-px bg-hairline-soft" />
                  <div className="px-5 py-[14px]">
                    <div className="text-[9.5px] font-bold tracking-[1.8px] text-faint">
                      DISCIPLESHIP TRACK · {done}/{total}
                    </div>
                    <div className="mt-2.5 flex flex-col gap-2">
                      {steps.map((s) => (
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
                  <div className="h-px bg-hairline-soft" />
                  <div className="px-[15px] py-3">
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="w-full cursor-pointer rounded-[10px] bg-ink py-[11px] text-[13px] font-bold text-paper"
                    >
                      View profile
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* ── GREETING ── */}
        <section className="mx-auto mt-[42px] max-w-[680px] text-center">
          <div className="min-h-[14px] text-[11.5px] font-bold uppercase tracking-[3px] text-brand">
            {greeting ?? " "}
          </div>
          <h1 className="mt-3.5 font-serif text-[52px] font-medium leading-[1.04] tracking-[-.4px]">
            Welcome back, <span className="italic text-brand">{firstName}</span>
          </h1>
          {config.welcomeLine && (
            <p className="mx-auto mt-4 max-w-[520px] text-[17px] leading-[1.55] text-ink-soft">{config.welcomeLine}</p>
          )}
        </section>

        {/* ── TRACK LADDER + NEXT-STEP DECK ── */}
        <section className="mt-10 grid grid-cols-[360px_1fr] items-stretch gap-[22px]">
          {/* Ladder */}
          <div className="rounded-[22px] border border-edge bg-card px-[26px] py-6">
            <div className="flex items-center gap-4">
              <div className="relative h-[78px] w-[78px] flex-none">
                <svg width="78" height="78" viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r={RING_R} fill="none" className="stroke-upcoming" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r={RING_R}
                    fill="none"
                    className="stroke-brand"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={RING_C.toFixed(1)}
                    strokeDashoffset={ringOffset.toFixed(1)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-serif text-[22px]">{pct}%</div>
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-[2px] text-faint">DISCIPLESHIP TRACK</div>
                <div className="mt-[3px] font-serif text-[21px] leading-[1.1]">
                  {done}/{total} steps
                </div>
                <div className="mt-0.5 text-[12.5px] text-ink-muted">{total - done} steps to go</div>
              </div>
            </div>

            <div className="mt-[22px] flex flex-col">
              {steps.map((s, i) => {
                const notLast = i < total - 1;
                return (
                  <div key={s.key} className="flex items-stretch gap-[13px]">
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
                    <div className="flex-1 pb-3.5">
                      <div
                        className={`text-[14.5px] leading-[1.2] ${s.inProgress ? "font-bold" : "font-semibold"} ${
                          !s.completed && !s.inProgress ? "text-faint" : "text-ink"
                        }`}
                      >
                        {s.label}
                      </div>
                      <div className="mt-px text-[11px] text-faint">{statusLabel(s)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next-step deck */}
          {card && (
            <div className="relative flex flex-col overflow-hidden rounded-[24px] bg-[linear-gradient(155deg,_rgb(var(--brand)),_rgb(var(--brand-card)))] px-9 py-[34px] text-on-accent shadow-[0_24px_54px_-26px_rgb(var(--brand-card)_/_0.6)]">
              <div className="pointer-events-none absolute -right-[50px] -top-[80px] h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,_rgba(255,220,205,0.2),_transparent_70%)]" />
              <div className="relative flex items-center justify-between">
                <div className="text-[11px] font-extrabold tracking-[2.6px] text-on-accent/70">YOUR NEXT STEPS</div>
                <div className="font-serif text-[15px] text-on-accent/70">
                  {di + 1} / {deck.length}
                </div>
              </div>
              <div className="relative flex flex-1 flex-col justify-center py-[22px]">
                <div className="self-start rounded-full bg-on-accent/15 px-[13px] py-[5px] text-[10.5px] font-bold tracking-[1.4px]">
                  {DECK_TAGS[di] ?? "LATER"}
                </div>
                <h2 className="mt-4 font-serif text-[40px] font-medium leading-[1.05] tracking-[-.4px]">{card.label}</h2>
                {card.description && (
                  <p className="mt-4 max-w-[560px] text-[16px] leading-[1.55] text-on-accent/80">{card.description}</p>
                )}
                <div className="mt-[26px] flex flex-wrap items-center gap-4">
                  <button className="cursor-pointer rounded-[13px] bg-card-2 px-6 py-[15px] text-[15px] font-bold text-brand-card transition hover:-translate-y-0.5">
                    {(card.ctaLabel ?? "Get started")} →
                  </button>
                  {card.meta && <div className="text-[12.5px] text-on-accent/70">{card.meta}</div>}
                </div>
              </div>
              <div className="relative mt-2 flex items-center justify-between">
                <div className="flex items-center gap-[7px]">
                  {deck.map((d, i) => (
                    <div
                      key={d.key}
                      className={`h-[7px] rounded-full ${i === di ? "w-[22px] bg-on-accent" : "w-[7px] bg-on-accent/40"}`}
                    />
                  ))}
                </div>
                <div className="flex gap-[9px]">
                  <button
                    onClick={() => setDeckIndex((n) => Math.max(0, n - 1))}
                    disabled={atStart}
                    className={`flex h-[42px] w-[42px] items-center justify-center rounded-full border border-on-accent/25 text-[17px] text-on-accent ${
                      atStart ? "cursor-default bg-on-accent/5 opacity-40" : "cursor-pointer bg-on-accent/15"
                    }`}
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setDeckIndex((n) => Math.min(deck.length - 1, n + 1))}
                    disabled={atEnd}
                    className={`flex h-[42px] w-[42px] items-center justify-center rounded-full border border-on-accent/25 text-[17px] text-on-accent ${
                      atEnd ? "cursor-default bg-on-accent/5 opacity-40" : "cursor-pointer bg-on-accent/15"
                    }`}
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── GROUP + GIVING (hardcoded) ── */}
        <section className="mt-[18px] grid grid-cols-2 items-stretch gap-[18px]">
          <div className="flex flex-wrap items-center justify-between gap-[18px] rounded-[22px] border border-edge bg-card px-[26px] py-[22px]">
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
            <button className="flex-none cursor-pointer rounded-[11px] bg-ink px-[17px] py-[11px] text-[13.5px] font-bold text-paper">
              Details
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-[18px] rounded-[22px] border border-edge bg-card px-[26px] py-[22px]">
            <div>
              <div className="text-[10px] font-bold tracking-[1.6px] text-faint">YOUR GIVING · {GIVING.year}</div>
              <div className="mt-[5px] flex items-baseline gap-[9px]">
                <div className="font-serif text-[38px] leading-none tracking-[-1px]">{GIVING.amount}</div>
                <div className="text-[12.5px] text-ink-muted">{GIVING.gifts} gifts</div>
              </div>
              <div className="mt-1.5 max-w-[240px] font-serif text-[12px] italic text-ink-muted">{GIVING.gratitude}</div>
            </div>
            <button className="flex-none cursor-pointer rounded-[11px] bg-brand px-[18px] py-[11px] text-[13.5px] font-bold text-on-accent">
              Give again
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
