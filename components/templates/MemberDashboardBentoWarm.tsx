"use client";

import { useEffect, useState } from "react";
import type { ChurchConfig } from "@/lib/types";
import { getMemberProgress, type StepItem } from "@/lib/steps";

/**
 * Warm Bento member dashboard — React/Tailwind port of `dashboard-warm-bento`.
 * 12-col bento grid: greeting, a circular progress ring, a segmented two-list
 * toggle, a brand-colored "next step" tile, plus hardcoded group + giving tiles.
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
  amount: "$1,240",
  gifts: 14,
  gratitude: "Thank you — every gift went into people far from God finding their way home.",
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

  const { discipleshipSteps, nextSteps } = getMemberProgress(config);
  const lists = [{ label: "Discipleship track", steps: discipleshipSteps }];
  if (nextSteps.length) lists.push({ label: "Next steps", steps: nextSteps });

  const [activeList, setActiveList] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
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
  const tdone = track.steps.filter((s) => s.completed).length;
  const ttotal = track.steps.length;
  const pct = ttotal ? Math.round((tdone / ttotal) * 100) : 0;
  const ringOffset = RING_C * (1 - pct / 100);
  const ac = currentOf(active.steps);
  const trackCurrent = currentOf(track.steps);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(900px_420px_at_85%_-6%,_rgb(var(--brand)_/_0.14),_transparent_60%),var(--paper)] px-[30px] pt-6 pb-[60px] text-ink">
      <div className="mx-auto max-w-[1200px]">
        {/* ── HEADER ── */}
        <header className="mb-[18px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-brand font-serif text-[21px] font-semibold text-on-accent">
              {config.churchName.charAt(0)}
            </div>
            <div className="font-serif text-[19px] font-semibold">{config.churchName}</div>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex cursor-pointer items-center gap-2.5 rounded-full border border-edge bg-card py-1.5 pl-[13px] pr-2"
            >
              <div className="text-[13px] font-bold">{firstName}</div>
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-edge bg-card-2 text-[13px] font-bold text-ink-soft">
                {firstName.charAt(0)}
              </div>
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40" />
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[320px] overflow-hidden rounded-[18px] border border-edge bg-card shadow-[0_30px_64px_-26px_rgba(20,12,6,0.4)]">
                  <div className="bg-card-2 px-5 pb-[15px] pt-[18px]">
                    <div className="text-[9.5px] font-extrabold tracking-[2.2px] text-brand">YOUR NEXT STEP</div>
                    <div className="mt-[5px] font-serif text-[22px] leading-[1.12]">{trackCurrent?.label ?? ""}</div>
                  </div>
                  <div className="h-px bg-hairline-soft" />
                  <div className="px-5 py-[14px]">
                    <div className="text-[9.5px] font-bold tracking-[1.8px] text-faint">
                      DISCIPLESHIP TRACK · {tdone}/{ttotal}
                    </div>
                    <div className="mt-2.5 flex flex-col gap-2">
                      {track.steps.map((s) => (
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

        {/* ── BENTO GRID ── */}
        <div className="grid grid-cols-12 gap-4">
          {/* Greeting */}
          <div className="col-start-1 col-span-7 rounded-[22px] border border-edge bg-card px-[30px] py-7">
            <div className="min-h-[14px] text-[11px] font-bold uppercase tracking-[2.6px] text-brand">
              {greeting ?? " "}
            </div>
            <h1 className="mt-3 font-serif text-[46px] font-medium leading-[1.02] tracking-[-.5px]">
              Welcome back,
              <br />
              <span className="italic text-brand">{firstName}.</span>
            </h1>
            {config.welcomeLine && (
              <p className="mt-3.5 max-w-[420px] text-[15.5px] leading-[1.5] text-ink-soft">{config.welcomeLine}</p>
            )}
          </div>

          {/* Progress ring */}
          <div className="col-start-8 col-span-5 flex items-center gap-[22px] rounded-[22px] border border-edge bg-[linear-gradient(155deg,_var(--card),_var(--card-2))] px-7 py-6">
            <div className="relative h-28 w-28 flex-none">
              <svg width="112" height="112" viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r={RING_R} fill="none" className="stroke-upcoming" strokeWidth="9" />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  className="stroke-brand"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={RING_C.toFixed(1)}
                  strokeDashoffset={ringOffset.toFixed(1)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-serif text-[30px] leading-none">{pct}%</div>
              </div>
            </div>
            <div>
              <div className="text-[10.5px] font-bold tracking-[2px] text-faint">YOUR JOURNEY</div>
              <div className="mt-1 font-serif text-[24px] leading-[1.1]">
                {tdone}/{ttotal} steps
              </div>
              <div className="mt-1 text-[13px] text-ink-soft">{ttotal - tdone} steps to go</div>
            </div>
          </div>

          {/* List tile (segmented) */}
          <div className="col-start-1 col-span-7 row-start-2 row-span-2 flex flex-col rounded-[22px] border border-edge bg-card px-[26px] py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-[22px] font-semibold">{active.label}</h2>
              {lists.length > 1 && (
                <div className="flex gap-0.5 rounded-[11px] bg-card-2 p-[3px]">
                  {lists.map((list, i) => (
                    <button
                      key={list.label}
                      onClick={() => setActiveList(i)}
                      className={`cursor-pointer rounded-[9px] px-[13px] py-[7px] text-[12.5px] font-bold ${
                        i === ai
                          ? "bg-brand text-on-accent shadow-[0_2px_8px_-2px_rgb(var(--brand)_/_0.5)]"
                          : "bg-transparent text-ink-soft"
                      }`}
                    >
                      {list.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-[18px] flex flex-col gap-2.5">
              {active.steps.map((s, i) => (
                <div
                  key={s.key}
                  className={`flex items-center gap-[13px] rounded-[13px] px-[13px] py-[11px] ${
                    s.inProgress ? "border border-brand/20 bg-brand/10" : "border border-transparent"
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
                        !s.completed && !s.inProgress ? "text-faint" : "text-ink"
                      }`}
                    >
                      {s.label}
                    </div>
                    <div className="mt-px text-[11.5px] text-faint">{statusLabel(s)}</div>
                  </div>
                  {s.inProgress && (
                    <div className="flex-none rounded-full bg-brand/15 px-[11px] py-[5px] text-[10px] font-extrabold tracking-[.6px] text-brand">
                      NEXT
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Next-step colored tile */}
          {ac && (
            <div className="col-start-8 col-span-5 row-start-2 relative overflow-hidden rounded-[22px] bg-[linear-gradient(150deg,_rgb(var(--brand)),_rgb(var(--brand-card)))] px-7 py-[26px] text-on-accent shadow-[0_20px_46px_-24px_rgb(var(--brand-card)_/_0.6)]">
              <div className="pointer-events-none absolute -right-[40px] -top-[60px] h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,_rgba(255,220,200,0.22),_transparent_70%)]" />
              <div className="relative">
                <div className="text-[10px] font-extrabold tracking-[2.2px] text-on-accent/70">YOUR NEXT STEP</div>
                <div className="mt-2.5 font-serif text-[28px] leading-[1.08]">{ac.label}</div>
                {ac.description && <p className="mt-[11px] text-[14px] leading-[1.5] text-on-accent/80">{ac.description}</p>}
                <button className="mt-[18px] cursor-pointer rounded-[11px] bg-card-2 px-[19px] py-[13px] text-[14px] font-bold text-brand-card transition hover:-translate-y-0.5">
                  {(ac.ctaLabel ?? "Get started")} →
                </button>
                {ac.meta && <span className="ml-3 text-[12px] text-on-accent/60">{ac.meta}</span>}
              </div>
            </div>
          )}

          {/* Group tile (hardcoded) */}
          <div className="col-start-8 col-span-5 row-start-3 rounded-[22px] border border-edge bg-card px-[26px] py-[22px]">
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
              <div className="cursor-pointer text-[12.5px] font-bold text-brand">Details →</div>
            </div>
          </div>

          {/* Giving tile (hardcoded, full width) */}
          <div className="col-start-1 col-span-12 row-start-4 flex flex-wrap items-center justify-between gap-[26px] rounded-[22px] border border-edge bg-card px-[30px] py-6">
            <div className="flex flex-wrap items-baseline gap-[18px]">
              <div>
                <div className="text-[10.5px] font-bold tracking-[2px] text-faint">YOUR GIVING · {GIVING.year}</div>
                <div className="mt-2 flex items-baseline gap-2.5">
                  <div className="font-serif text-[46px] leading-none tracking-[-1px]">{GIVING.amount}</div>
                  <div className="text-[13px] text-ink-soft">{GIVING.gifts} gifts</div>
                </div>
              </div>
              <p className="m-0 max-w-[400px] font-serif text-[16px] italic leading-[1.4] text-ink-soft">
                {GIVING.gratitude}
              </p>
            </div>
            <div className="flex flex-none gap-2.5">
              <button className="cursor-pointer rounded-[11px] bg-brand px-5 py-[13px] text-[14px] font-bold text-on-accent">
                Give again
              </button>
              <button className="cursor-pointer rounded-[11px] border border-edge bg-transparent px-[18px] py-[13px] text-[14px] font-semibold text-ink-soft">
                Statement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
