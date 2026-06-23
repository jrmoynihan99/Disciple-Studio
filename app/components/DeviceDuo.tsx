"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TrafficLights } from "@/app/components/ui";

const STRIPES =
  "bg-[repeating-linear-gradient(45deg,var(--color-paper-2),var(--color-paper-2)_10px,var(--color-paper-3)_10px,var(--color-paper-3)_20px)]";

/* ---------- in-view trigger ---------- */
function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    const t = setTimeout(() => setInView(true), 900);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);
  return [ref, inView] as const;
}

/* ============================================================
   The website (Reach) — public front door in a browser
   ============================================================ */
function BrowserSite() {
  const line = "rounded-[3px] bg-ink/15";
  const navBar = "block h-1 w-[22px] rounded-[2px] bg-line";
  return (
    <div className="w-full overflow-hidden rounded-[15px] border border-line bg-card shadow-[0_2px_1px_var(--color-line-2),0_44px_80px_-44px_rgba(0,0,0,0.55)]">
      {/* chrome */}
      <div className="flex items-center gap-1.5 border-b border-line bg-[color-mix(in_oklab,var(--color-card)_90%,var(--color-ink))] px-3.5 py-[10px]">
        <TrafficLights small />
        <span className="ml-2.5 flex items-center gap-1.5 rounded-md bg-paper-2 px-2.5 py-[3px] font-mono text-[10.5px] text-muted">
          <span className="h-[6px] w-[6px] rounded-full bg-[#8fbf8a]" />
          grace.church
        </span>
        <span className="ml-auto rounded-full bg-ink px-3 py-[5px] text-[10px] font-semibold text-paper">
          Sign in
        </span>
      </div>
      {/* page */}
      <div className="flex h-[330px] flex-col max-[520px]:h-[260px]">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-2.5">
          <b className="font-serif text-[13px] text-accent">Grace</b>
          <span className="ml-2 flex gap-1.5">
            <i className={navBar} />
            <i className={navBar} />
            <i className={navBar} />
          </span>
        </div>
        <div className={`flex flex-col gap-2 px-4 pb-5 pt-5 ${STRIPES}`}>
          <div className="font-serif text-[20px] leading-[1.05]">
            You&rsquo;re welcome here.
          </div>
          <div className={`h-1.5 w-[55%] ${line}`} />
          <div className={`h-1.5 w-[36%] ${line}`} />
          <span className="mt-1.5 self-start rounded-full bg-accent px-3 py-[7px] text-[10px] font-semibold text-white">
            Plan your visit
          </span>
        </div>
        <div className="flex flex-1 flex-col px-4 py-3.5">
          <div className="mb-2 font-mono text-[8px] tracking-[0.14em] text-accent">
            THIS SUNDAY
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 rounded-lg border border-line bg-card p-2"
              >
                <div className="h-9 rounded-md bg-paper-3" />
                <div className={`h-1 w-[72%] ${line}`} />
                <div className={`h-1 w-[46%] ${line}`} />
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-2.5">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent text-[9px] text-white">
              {"▶"}
            </span>
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-[11px] font-semibold">
                The Prodigal Son
              </span>
              <span className="text-[9px] text-muted">
                Parables · Pastor James
              </span>
            </span>
            <span className="ml-auto whitespace-nowrap rounded-full bg-paper-2 px-2.5 py-1 text-[8.5px] font-semibold text-ink-soft">
              Watch
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Shared phone chrome
   ============================================================ */
function StatusBar({ dark = false }: { dark?: boolean }) {
  const c = dark ? "bg-white/85" : "bg-ink/80";
  return (
    <div className="relative z-10 flex items-center justify-between px-5 pt-[7px]">
      <span
        className={`font-sans text-[10px] font-semibold ${
          dark ? "text-white/90" : "text-ink"
        }`}
      >
        9:41
      </span>
      <span className="flex items-center gap-[3px]">
        <i className={`block h-[7px] w-[7px] rounded-[1px] ${c}`} />
        <i className={`block h-[7px] w-[10px] rounded-[2px] ${c}`} />
        <i className={`block h-[7px] w-[16px] rounded-[2px] ${c}`} />
      </span>
    </div>
  );
}

function TabBar({ active, tabs }: { active: number; tabs: string[] }) {
  return (
    <div className="flex items-center justify-around border-t border-line bg-card px-2 pb-3 pt-2">
      {tabs.map((t, i) => (
        <span
          key={t}
          className={`flex flex-col items-center gap-1 text-[7.5px] font-medium ${
            i === active ? "text-accent" : "text-muted"
          }`}
        >
          <span
            className={`h-[14px] w-[14px] rounded-[5px] ${
              i === active ? "bg-accent" : "bg-line-2"
            }`}
          />
          {t}
        </span>
      ))}
    </div>
  );
}

const PUBLIC_TABS = ["Home", "Watch", "Groups", "Give"];
const MEMBER_TABS = ["Today", "Journey", "Watch", "Give"];

/* ============================================================
   PUBLIC deck — the beautiful native front door (feature 04)
   No login, no personal next step — that's the discipleship boom.
   ============================================================ */
function ScreenHome() {
  return (
    <div className="absolute inset-0 flex flex-col bg-paper">
      <StatusBar />
      <div className="flex items-center gap-2 px-4 pb-2 pt-2.5">
        <b className="font-serif text-[15px] text-accent">Grace</b>
        <span className="ml-auto h-[3px] w-[16px] rounded-full bg-line" />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-hidden px-3 pb-3">
        <div className={`relative overflow-hidden rounded-[16px] p-3.5 ${STRIPES}`}>
          <div className="font-serif text-[17px] leading-[1.05]">
            You&rsquo;re welcome here.
          </div>
          <div className="mt-1 text-[9.5px] text-ink-soft">
            Sundays · 9 &amp; 11am
          </div>
          <span className="mt-2.5 inline-flex rounded-full bg-accent px-3 py-1.5 text-[10px] font-semibold text-white">
            Plan your visit
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["▶", "Watch"],
            ["◎", "Groups"],
            ["♡", "Give"],
          ].map(([icon, t]) => (
            <div
              key={t}
              className="flex flex-col items-center gap-1 rounded-[12px] border border-line bg-card py-2.5"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-tint text-[12px] text-accent">
                {icon}
              </span>
              <span className="text-[9px] font-semibold">{t}</span>
            </div>
          ))}
        </div>
        <div className="rounded-[14px] border border-line bg-card p-2.5">
          <span className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-accent">
            Latest sermon
          </span>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-accent text-[11px] text-white">
              {"▶"}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[11px] font-semibold">
                The Prodigal Son
              </span>
              <span className="text-[9px] text-muted">
                Parables · Pastor James
              </span>
            </span>
          </div>
        </div>
      </div>
      <TabBar active={0} tabs={PUBLIC_TABS} />
    </div>
  );
}

function ScreenWatch() {
  return (
    <div className="absolute inset-0 flex flex-col bg-paper">
      <StatusBar />
      <div className="flex items-center px-4 pb-2 pt-2.5">
        <b className="font-serif text-[14px]">Watch</b>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-hidden px-3 pb-3">
        <div className="overflow-hidden rounded-[16px] border border-line bg-card">
          <div className="relative grid h-[92px] place-items-center bg-[repeating-linear-gradient(45deg,var(--color-paper-2),var(--color-paper-2)_9px,var(--color-paper-3)_9px,var(--color-paper-3)_18px)]">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-[12px] text-white">
              {"▶"}
            </span>
          </div>
          <div className="p-2.5">
            <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-accent">
              Parables
            </span>
            <div className="text-[12px] font-semibold">The Prodigal Son</div>
            <div className="text-[9px] text-muted">Pastor James · 38 min</div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {[
            ["Rooted in Grace", "Pastor Dana"],
            ["Living Sent", "Pastor James"],
          ].map(([t, s]) => (
            <div
              key={t}
              className="flex items-center gap-2.5 rounded-[12px] border border-line bg-card p-2"
            >
              <div className="h-9 w-12 flex-none rounded-[8px] bg-paper-3" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[11px] font-semibold">{t}</span>
                <span className="text-[9px] text-muted">{s}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <TabBar active={1} tabs={PUBLIC_TABS} />
    </div>
  );
}

function ScreenGroups() {
  return (
    <div className="absolute inset-0 flex flex-col bg-paper">
      <StatusBar />
      <div className="flex items-center px-4 pb-2 pt-2.5">
        <b className="font-serif text-[14px]">Find a Group</b>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 pb-3">
        <div className="flex gap-1.5">
          {["All", "Mornings", "Evenings"].map((t, i) => (
            <span
              key={t}
              className={`rounded-full px-2.5 py-1 text-[8px] font-semibold ${
                i === 0 ? "bg-accent text-white" : "bg-paper-2 text-ink-soft"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
        {[
          ["Tuesday Women’s", "Tue · 7pm · Beth"],
          ["Men’s Breakfast", "Sat · 8am · Carlos"],
          ["Young Adults", "Fri · 7pm · Priya"],
        ].map(([n, d]) => (
          <div
            key={n}
            className="flex items-center gap-2 rounded-[12px] border border-line bg-card px-2.5 py-2"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[11px] font-semibold">{n}</span>
              <span className="text-[9px] text-muted">{d}</span>
            </span>
            <span className="ml-auto rounded-full bg-accent px-2.5 py-1 text-[9px] font-semibold text-white">
              Join
            </span>
          </div>
        ))}
      </div>
      <TabBar active={2} tabs={PUBLIC_TABS} />
    </div>
  );
}

function ScreenGive() {
  return (
    <div className="absolute inset-0 flex flex-col bg-paper">
      <StatusBar />
      <div className="flex items-center px-4 pb-2 pt-2.5">
        <b className="font-serif text-[14px]">Give</b>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-3 pb-3">
        <div className="flex gap-1.5">
          <span className="rounded-full bg-ink px-3 py-1 text-[8.5px] font-semibold text-paper">
            One-time
          </span>
          <span className="rounded-full bg-paper-2 px-3 py-1 text-[8.5px] font-semibold text-ink-soft">
            Monthly
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {["$25", "$50", "$100", "$250"].map((a, i) => (
            <div
              key={a}
              className={`grid place-items-center rounded-[12px] border py-3 font-serif text-[16px] ${
                i === 1
                  ? "border-accent bg-accent-tint text-accent"
                  : "border-line bg-card text-ink"
              }`}
            >
              {a}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-[10px] border border-line bg-paper-2 px-3 py-2 text-[10px]">
          <span className="text-muted">Fund</span>
          <span className="font-medium">General ▾</span>
        </div>
        <div className="mt-auto grid place-items-center rounded-[12px] bg-accent py-2.5 text-[11px] font-semibold text-white">
          Give $50 →
        </div>
      </div>
      <TabBar active={3} tabs={PUBLIC_TABS} />
    </div>
  );
}

/* ============================================================
   MEMBER deck — the signed-in discipleship boom (discipleship section)
   ============================================================ */
function ScreenLock() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[radial-gradient(120%_80%_at_50%_0%,#2a2017,#0e0b07_70%)]">
      <StatusBar dark />
      <div className="absolute inset-x-0 top-[16%] flex flex-col items-center">
        <span className="font-sans text-[11px] font-medium text-white/55">
          Sunday morning
        </span>
        <span className="font-sans text-[58px] font-semibold leading-none tracking-[-0.02em] text-white/95">
          9:41
        </span>
      </div>
      <div className="mt-auto px-3 pb-7">
        <div className="animate-pop rounded-[18px] border border-white/10 bg-white/[0.13] p-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-[8px] bg-accent text-[13px] text-white">
              {"✝"}
            </span>
            <span className="font-sans text-[10.5px] font-semibold text-white">
              GRACE CHURCH
            </span>
            <span className="ml-auto font-sans text-[9px] text-white/55">now</span>
          </div>
          <div className="mt-2">
            <div className="font-sans text-[12px] font-semibold leading-tight text-white">
              Your next step is ready
            </div>
            <div className="mt-0.5 font-sans text-[10.5px] leading-snug text-white/75">
              There&rsquo;s a community group that meets Tuesdays near you.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenToday() {
  const d = (ms: number) => ({ animationDelay: ms + "ms" });
  return (
    <div className="absolute inset-0 flex flex-col bg-paper">
      <StatusBar />
      <div className="flex items-center gap-2 px-4 pb-2 pt-2.5">
        <b className="font-serif text-[14px] text-accent">Grace</b>
        <span className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-accent text-[10px] font-semibold text-white">
          S
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-hidden px-4 pb-4">
        <div
          className="animate-fade-in-back font-serif text-[19px] leading-[1.1]"
          style={d(80)}
        >
          Good morning, Sarah.
        </div>
        <div
          className="animate-fade-in-back relative overflow-hidden rounded-[16px] bg-accent p-3.5 text-white"
          style={d(180)}
        >
          <span className="font-mono text-[8px] tracking-[0.14em] text-white/70">
            YOUR NEXT STEP
          </span>
          <div className="mt-1 font-serif text-[17px] leading-tight">
            Join a community group
          </div>
          <span className="mt-2.5 inline-flex rounded-full bg-white/20 px-3 py-1.5 text-[10px] font-semibold">
            See groups →
          </span>
        </div>
        <div
          className="animate-fade-in-back rounded-[14px] border border-line bg-card p-3"
          style={d(300)}
        >
          <span className="font-mono text-[8px] tracking-[0.13em] text-muted">
            YOUR GROUP
          </span>
          <div className="mt-0.5 text-[12px] font-semibold">
            Tuesday Women&rsquo;s Group
          </div>
          <div className="text-[9.5px] text-muted">Next: Tue 7:00pm · Beth</div>
          <div className="mt-2 flex">
            {["B", "S", "M", "+5"].map((a, i) => (
              <span
                key={i}
                className={`-ml-1.5 grid h-5 w-5 place-items-center rounded-full text-[8px] font-semibold ring-2 ring-card first:ml-0 ${
                  a.startsWith("+")
                    ? "bg-paper-3 text-ink-soft"
                    : "bg-ink text-paper"
                }`}
              >
                {a}
              </span>
            ))}
          </div>
        </div>
        <div
          className="animate-fade-in-back mt-auto flex items-center gap-2.5 rounded-[14px] border border-line bg-card p-2.5"
          style={d(420)}
        >
          <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-accent text-[10px] text-white">
            {"▶"}
          </span>
          <span className="flex min-w-0 flex-col gap-px">
            <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-accent">
              Continue watching
            </span>
            <span className="truncate text-[11px] font-semibold">
              The Prodigal Son
            </span>
          </span>
        </div>
      </div>
      <TabBar active={0} tabs={MEMBER_TABS} />
    </div>
  );
}

const JOURNEY = [
  { t: "Attend a gathering", s: "done" },
  { t: "Get baptized", s: "done" },
  { t: "Join a community group", s: "now" },
  { t: "Membership class", s: "next" },
  { t: "Find a place to serve", s: "next" },
] as const;

function ScreenJourney() {
  const d = (ms: number) => ({ animationDelay: ms + "ms" });
  return (
    <div className="absolute inset-0 flex flex-col bg-paper">
      <StatusBar />
      <div className="flex items-center gap-2 px-4 pb-2 pt-2.5">
        <span className="font-sans text-[15px] text-ink-soft">‹</span>
        <b className="font-serif text-[14px]">Your Journey</b>
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="relative pl-1 pt-1">
          <div className="absolute bottom-[14px] left-[10px] top-[14px] w-[2px] rounded-full bg-line-2" />
          <div
            className="absolute left-[10px] top-[14px] w-[2px] rounded-full bg-accent"
            style={{ height: "44%" }}
          />
          <div className="flex flex-col gap-1">
            {JOURNEY.map((j, i) => (
              <div
                key={i}
                className="animate-fade-in-back relative flex items-center gap-2.5 py-[7px]"
                style={d(120 + i * 90)}
              >
                <span
                  className={`relative z-[1] grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-[9px] ${
                    j.s === "done"
                      ? "bg-[#3a6a4e] text-white"
                      : j.s === "now"
                        ? "animate-pulse-dot bg-accent text-white"
                        : "bg-paper shadow-[inset_0_0_0_2px_var(--color-line)]"
                  }`}
                >
                  {j.s === "done" ? "✓" : j.s === "now" ? "→" : ""}
                </span>
                <span
                  className={`text-[11.5px] ${
                    j.s === "done"
                      ? "text-muted line-through"
                      : j.s === "now"
                        ? "font-semibold"
                        : "text-ink-soft"
                  }`}
                >
                  {j.t}
                </span>
                {j.s === "now" && (
                  <span className="ml-auto font-mono text-[7.5px] text-accent">
                    YOU&rsquo;RE HERE
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div
          className="animate-fade-in-back mt-auto flex items-center gap-2 rounded-[14px] border border-accent/25 bg-accent-tint px-3 py-2.5"
          style={d(640)}
        >
          <div className="min-w-0">
            <span className="block font-mono text-[7.5px] tracking-[0.13em] text-accent">
              NEXT STEP
            </span>
            <b className="text-[11px]">Join a community group</b>
          </div>
          <span className="ml-auto whitespace-nowrap rounded-full bg-accent px-2.5 py-1 text-[9px] font-semibold text-white">
            Start →
          </span>
        </div>
      </div>
      <TabBar active={1} tabs={MEMBER_TABS} />
    </div>
  );
}

/* ============================================================
   Phone shell + deck cycler
   ============================================================ */
type ScreenDef = { name: string; ms: number; Comp: React.ComponentType };

const PUBLIC_DECK: ScreenDef[] = [
  { name: "home", ms: 3400, Comp: ScreenHome },
  { name: "watch", ms: 3200, Comp: ScreenWatch },
  { name: "groups", ms: 3200, Comp: ScreenGroups },
  { name: "give", ms: 3000, Comp: ScreenGive },
];

const MEMBER_DECK: ScreenDef[] = [
  { name: "lock", ms: 3200, Comp: ScreenLock },
  { name: "today", ms: 3800, Comp: ScreenToday },
  { name: "journey", ms: 3400, Comp: ScreenJourney },
];

export { PUBLIC_DECK, MEMBER_DECK };

function useDeck(on: boolean, deck: ScreenDef[]) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setTimeout(
      () => setIdx((v) => (v + 1) % deck.length),
      deck[idx].ms,
    );
    return () => clearTimeout(t);
  }, [on, idx, deck]);
  return idx;
}

function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[34px] border border-white/10 bg-[#0b0907] p-[7px] shadow-[0_50px_90px_-30px_rgba(0,0,0,0.75)]">
      <div className="relative aspect-[9/19.3] w-full overflow-hidden rounded-[27px] bg-paper">
        {/* dynamic island */}
        <div className="absolute left-1/2 top-[7px] z-20 h-[17px] w-[52px] -translate-x-1/2 rounded-full bg-black" />
        {children}
      </div>
    </div>
  );
}

export function AppPhone({
  on,
  deck = MEMBER_DECK,
  fixedIndex,
}: {
  on: boolean;
  deck?: ScreenDef[];
  fixedIndex?: number;
}) {
  const cycled = useDeck(on && fixedIndex == null, deck);
  const idx = fixedIndex ?? cycled;
  const Comp = deck[idx].Comp;
  return (
    <PhoneShell>
      <div key={deck[idx].name} className="absolute inset-0 animate-fade-in">
        <Comp />
      </div>
    </PhoneShell>
  );
}

/* ============================================================
   The duo — browser with the phone overlapping its corner
   (member deck — used in the discipleship section)
   ============================================================ */
export default function DeviceDuo() {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className="flex justify-center max-[760px]:justify-start max-[760px]:overflow-x-auto max-[760px]:pb-2"
    >
      <div
        className={`relative w-[600px] flex-none pb-[34px] pr-[60px] transition-[opacity,translate] duration-700 max-[760px]:w-[560px] ${
          inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-10 top-6 -z-10 h-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(187,74,35,0.22),transparent_75%)] blur-xl" />
        <BrowserSite />
        <div className="absolute -bottom-1 right-0 w-[156px]">
          <AppPhone on={inView} deck={MEMBER_DECK} />
        </div>
      </div>
    </div>
  );
}