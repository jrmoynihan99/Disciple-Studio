"use client";

import { useEffect, useState } from "react";
import type { ChurchConfig } from "@/lib/types";
import { getMemberProgress, type StepItem } from "@/lib/steps";

/**
 * Editorial member dashboard — React/Tailwind port of `dashboard-editorial`.
 * Greeting + journey progress, an interactive pathway (click a step to preview
 * it in the focal card), plus hardcoded group + giving cards.
 *
 * Self-chromed (own header + dropdown). All colors come from the semantic
 * palette tokens injected by DemoChrome (bg-paper, text-ink, bg-brand, …), so
 * it adapts to light/dark automatically. Serif = the configured `font-serif`.
 */

// Group + giving are sample content, hardcoded (not configurable).
const GROUP = {
  name: "Eastside Tuesday Group",
  host: "Marcus & Renee Hill",
  location: "Riverside Ave, Eastside",
  nextMeeting: "Tue, Jul 1 · 7:00 PM",
};
const GIVING = {
  year: "2026",
  amount: "$1,240",
  gifts: 14,
  gratitude:
    "Thank you — every gift this year went straight into people far from God finding their way home.",
};

function statusTag(s: StepItem): string {
  if (s.completed) return "COMPLETED";
  if (s.inProgress) return "YOU'RE HERE";
  return "COMING UP";
}

export default function MemberDashboardEditorial({ config }: { config: ChurchConfig }) {
  const { demoMember } = config;
  const firstName = demoMember.firstName;

  const { discipleshipSteps, nextSteps } = getMemberProgress(config);
  const lists = [{ label: "Your discipleship pathway", steps: discipleshipSteps }];
  if (nextSteps.length) lists.push({ label: "Your next steps", steps: nextSteps });

  const pathway = lists[0];
  const total = pathway.steps.length;
  const doneCount = pathway.steps.filter((s) => s.completed).length;

  let defIdx = pathway.steps.findIndex((s) => s.inProgress);
  if (defIdx < 0) defIdx = pathway.steps.findIndex((s) => !s.completed);
  if (defIdx < 0) defIdx = 0;

  const [selKey, setSelKey] = useState(`0-${defIdx}`);
  const [menuOpen, setMenuOpen] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => {
    const h = new Date().getHours();
    const word = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    setGreeting(`${word} · ${date}`);
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
    <div className="relative min-h-screen bg-paper px-10 pt-[34px] pb-20 text-ink">
      {/* Ambient glows (decorative) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[14%] h-[46vw] w-[46vw] rounded-full bg-[radial-gradient(circle,_rgb(var(--brand)_/_0.11),_transparent_67%)] blur-[40px] animate-[edDrift1_26s_ease-in-out_infinite]" />
        <div className="absolute -bottom-[16%] -right-[12%] h-[52vw] w-[52vw] rounded-full bg-[radial-gradient(circle,_rgb(var(--brand)_/_0.08),_transparent_70%)] blur-[48px] animate-[edDrift2_33s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-[1] mx-auto max-w-[1180px]">
        {/* ── HEADER ── */}
        <header className="flex items-center justify-between border-b border-hairline pb-[22px]">
          <div className="flex items-center gap-[13px]">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-brand font-serif text-[21px] font-semibold text-on-accent">
              {config.churchName.charAt(0)}
            </div>
            <div className="leading-[1.1]">
              <div className="font-serif text-[18px] font-semibold tracking-[.1px]">{config.churchName}</div>
              <div className="mt-0.5 text-[10.5px] font-semibold tracking-[2.4px] text-faint">MEMBER PORTAL</div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex cursor-pointer items-center gap-[11px] rounded-xl border-0 bg-transparent p-1"
            >
              <div className="text-right leading-[1.15]">
                <div className="text-[13px] font-semibold text-ink">{firstName}</div>
                {demoMember.memberSince && <div className="text-[11px] text-faint">{demoMember.memberSince}</div>}
              </div>
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-edge bg-card-2 text-[14px] font-semibold text-ink-soft">
                {firstName.charAt(0)}
              </div>
              <span className="translate-y-px text-[11px] text-faint">▾</span>
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40" />
                <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-80 overflow-hidden rounded-[18px] border border-hairline bg-card shadow-[0_34px_70px_-28px_rgba(20,12,10,0.34)]">
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
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="w-full cursor-pointer rounded-[11px] border-0 bg-ink py-3 text-[13.5px] font-bold text-paper"
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
        <section className="mt-[46px] flex flex-wrap items-end justify-between gap-10">
          <div className="max-w-[640px]">
            <div className="min-h-[14px] text-[11.5px] font-semibold uppercase tracking-[2.6px] text-brand">
              {greeting ?? " "}
            </div>
            <h1 className="mt-[14px] font-serif text-[58px] font-medium leading-[1.02] tracking-[-.6px]">
              Welcome back,
              <br />
              <span className="italic text-brand">{firstName}.</span>
            </h1>
            {config.welcomeLine && (
              <p className="mt-[18px] max-w-[480px] text-[17px] leading-[1.5] text-ink-soft">{config.welcomeLine}</p>
            )}
          </div>
          <div className="pb-[6px] text-right leading-[1.1]">
            <div className="text-[11px] font-semibold tracking-[2px] text-faint">YOUR JOURNEY</div>
            <div className="mt-[6px] font-serif text-[34px] font-semibold">
              {doneCount}/{total}
            </div>
            <div className="mt-0.5 text-[12.5px] text-ink-muted">steps complete</div>
          </div>
        </section>

        {/* ── LISTS + FOCAL CARD ── */}
        <section className="mt-[44px] grid grid-cols-[1.05fr_.95fr] items-start gap-10">
          <div>
            {lists.map((list, li) => (
              <div key={list.label} className="mb-[30px]">
                <div className="mb-[22px] text-[11.5px] font-semibold uppercase tracking-[2.4px] text-faint">
                  {list.label}
                </div>
                <div className="flex flex-col">
                  {list.steps.map((s, si) => {
                    const key = `${li}-${si}`;
                    const isSelected = key === selKey;
                    const notLast = si < list.steps.length - 1;
                    return (
                      <div
                        key={s.key}
                        onClick={() => setSelKey(key)}
                        className="flex cursor-pointer items-stretch gap-[18px]"
                      >
                        <div className="flex w-[34px] flex-none flex-col items-center">
                          {s.completed ? (
                            <div
                              className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-brand ${
                                isSelected
                                  ? "shadow-[0_0_0_4px_rgb(var(--brand)_/_0.18)]"
                                  : "shadow-[0_2px_8px_rgb(var(--brand)_/_0.25)]"
                              }`}
                            >
                              <span className="text-[15px] leading-none text-on-accent">✓</span>
                            </div>
                          ) : s.inProgress ? (
                            <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border-[2.5px] border-brand bg-card animate-[edPulse_2.6s_ease-in-out_infinite]">
                              <div className="h-[11px] w-[11px] rounded-full bg-brand" />
                            </div>
                          ) : (
                            <div
                              className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border-2 bg-transparent ${
                                isSelected ? "border-brand" : "border-upcoming"
                              }`}
                            >
                              <span className="font-serif text-[12px] font-semibold text-faint">
                                {String(si + 1).padStart(2, "0")}
                              </span>
                            </div>
                          )}
                          {notLast && (
                            <div className={`mt-[5px] min-h-[30px] w-0.5 flex-1 ${s.completed ? "bg-brand" : "bg-upcoming"}`} />
                          )}
                        </div>

                        <div className="flex-1 pb-[24px]">
                          {isSelected ? (
                            <div className="-mt-1 rounded-[15px] border border-brand/25 bg-brand/10 px-[18px] py-[14px] shadow-[0_10px_26px_-16px_rgb(var(--brand)_/_0.5)]">
                              <div className="flex items-center justify-between">
                                <div className="text-[10.5px] font-bold tracking-[2.2px] text-brand">{statusTag(s)}</div>
                                <div className="text-[10.5px] tracking-[.4px] text-brand/70">shown →</div>
                              </div>
                              <div className="mt-[5px] font-serif text-[23px] font-semibold leading-[1.15]">{s.label}</div>
                            </div>
                          ) : (
                            <div className="pt-[5px]">
                              <div
                                className={`font-serif text-[20px] font-medium leading-[1.2] ${
                                  !s.completed && !s.inProgress ? "text-faint" : "text-ink"
                                }`}
                              >
                                {s.label}
                              </div>
                              <div className="mt-[3px] text-[12px] tracking-[.2px] text-ink-muted">
                                {s.completed ? "Completed" : s.inProgress ? "You're here" : "Upcoming"}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Focal card */}
          {sel && (
            <div className="sticky top-[30px] overflow-hidden rounded-[22px] bg-brand-card px-8 py-[34px] text-on-accent shadow-[0_24px_60px_-22px_rgb(var(--brand-card)_/_0.6)]">
              <div className="pointer-events-none absolute -right-[40px] -top-[60px] h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,_rgba(255,210,190,0.18),_transparent_70%)]" />
              <div className="text-[11px] font-bold tracking-[2.6px] text-on-accent/70">
                {sel.completed ? "COMPLETED ✓" : sel.inProgress ? "YOUR NEXT STEP" : "COMING UP"}
              </div>
              <h2 className="mt-[14px] font-serif text-[36px] font-medium leading-[1.08] tracking-[-.3px]">{sel.label}</h2>
              {sel.description && <p className="mt-4 text-[15px] leading-[1.55] text-on-accent/80">{sel.description}</p>}
              <button className="mt-[26px] w-full cursor-pointer rounded-[13px] border-0 bg-card-2 py-4 text-[15px] font-bold tracking-[.1px] text-brand-card transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.35)]">
                {(sel.ctaLabel ?? "Open")} →
              </button>
              {sel.meta && <div className="mt-[14px] text-center text-[12px] text-on-accent/60">{sel.meta}</div>}
            </div>
          )}
        </section>

        {/* ── GROUP + GIVING (hardcoded) ── */}
        <section className="mt-[34px] grid grid-cols-[1.05fr_.95fr] items-stretch gap-10">
          <div className="rounded-[20px] border border-edge bg-card px-7 py-[26px]">
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
              <div className="cursor-pointer text-[13px] font-semibold text-brand">Details →</div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[20px] border border-edge bg-card px-7 py-[26px]">
            <div>
              <div className="text-[11px] font-bold tracking-[2.2px] text-faint">YOUR GIVING · {GIVING.year}</div>
              <div className="mt-[14px] flex items-baseline gap-2.5">
                <div className="font-serif text-[46px] font-semibold tracking-[-1px]">{GIVING.amount}</div>
                <div className="text-[13px] text-ink-muted">{GIVING.gifts} gifts</div>
              </div>
            </div>
            <p className="mt-5 font-serif text-[14.5px] italic leading-[1.5] text-ink-soft">{GIVING.gratitude}</p>
            <div className="mt-[18px] flex gap-2.5">
              <button className="flex-1 cursor-pointer rounded-xl border-0 bg-ink py-[13px] text-[14px] font-semibold text-paper">
                Give again
              </button>
              <button className="flex-none cursor-pointer rounded-xl border border-edge bg-transparent px-[18px] py-[13px] text-[14px] font-semibold text-ink-soft">
                Statement
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
