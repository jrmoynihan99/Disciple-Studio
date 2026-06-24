"use client";

import { useState, useEffect, useRef } from "react";
import { DATA } from "@/app/data";
import { Btn, Eyebrow, SecTitle, TrafficLights, Wrap } from "@/app/components/ui";
import {
  AppPhone,
  PhoneShell,
  PUBLIC_DECK,
  ScreenJourney,
  ScreenGive,
  ScreenPush,
  ScreenSermon,
  ScreenGroupsMap,
  ScreenDream,
} from "@/app/components/DeviceDuo";

/* ---------- shared hooks ---------- */
function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const isMobile = window.innerWidth <= 940;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      {
        threshold: isMobile ? 0.01 : 0.12,
        rootMargin: isMobile ? "0px" : "0px 0px -8% 0px",
      },
    );
    io.observe(el);
    const t = setTimeout(() => setInView(true), 800);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);
  return [ref, inView] as const;
}

function useCycle(max: number, ms: number, on: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setI((v) => (v + 1) % max), ms);
    return () => clearInterval(t);
  }, [on, max, ms]);
  return i;
}

function useTypewriter(text: string, on: boolean, key: number) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!on) {
      setOut(text);
      return;
    }
    setOut("");
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      i++;
      setOut(text.slice(0, i));
      if (i < text.length) t = setTimeout(tick, 55);
    };
    t = setTimeout(tick, 350);
    return () => clearTimeout(t);
  }, [on, key, text]);
  return out;
}

/* ---------- demo chrome ---------- */
function DemoFrame({
  children,
  bar,
}: {
  children: React.ReactNode;
  bar: string;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-card shadow-[0_2px_1px_var(--color-line-2),0_30px_60px_-34px_rgba(28,24,19,0.4)] transition-[translate,box-shadow,border-color] duration-[280ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-[5px] hover:shadow-[0_42px_66px_-36px_rgba(28,24,19,0.5)]">
      <div className="flex items-center gap-1.5 border-b border-line bg-[color-mix(in_oklab,var(--color-card)_90%,var(--color-ink))] px-3.5 py-[11px]">
        <TrafficLights />
        <div className="ml-2.5 font-mono text-[11.5px] text-muted">{bar}</div>
      </div>
      <div className="p-[18px]">{children}</div>
    </div>
  );
}

/* ---- 01: Modern ---- */
const BRANDS = [
  { name: "Grace Community", domain: "gracecommunity.example", c: "#bb4a23" },
  { name: "Hillside Chapel", domain: "hillsidechapel.example", c: "#345044" },
  { name: "New City Church", domain: "newcitychurch.example", c: "#3a5878" },
];

function Gauge({ on }: { on: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!on) {
      setV(0);
      return;
    }
    let raf: number;
    let start: number | undefined;
    const dur = 1400;
    const target = 99;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(e * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 80 80" width="78" height="78">
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="7"
        />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C - C * (v / 100)}
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset .2s linear" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center font-serif text-[22px] font-semibold leading-none">
        {v}
        <small className="font-mono text-[8px] tracking-[0.1em] text-muted">
          perf
        </small>
      </div>
    </div>
  );
}

function DemoModern({ on }: { on: boolean }) {
  const bi = useCycle(BRANDS.length, 2800, on);
  const b = BRANDS[bi];
  return (
    <DemoFrame bar={b.domain}>
      <div className="grid h-[360px] grid-cols-[1fr_120px] gap-4 max-[940px]:grid-cols-[1fr_100px]">
        {/* the mini site, re-skinned by whichever brand is active */}
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-card">
          <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5">
            <b
              className="font-serif text-[13px] leading-none transition-colors duration-500"
              style={{ color: b.c }}
            >
              {b.name}
            </b>
            <span className="ml-auto flex gap-1.5">
              <i className="block h-1 w-5 rounded-[2px] bg-line" />
              <i className="block h-1 w-5 rounded-[2px] bg-line" />
              <i className="block h-1 w-5 rounded-[2px] bg-line" />
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-[9px] font-semibold text-white transition-colors duration-500"
              style={{ background: b.c }}
            >
              Visit
            </span>
          </div>
          <div
            className="flex flex-col gap-1.5 px-3.5 pb-4 pt-4 transition-colors duration-500"
            style={{
              background: `color-mix(in oklab, ${b.c} 9%, var(--color-card))`,
            }}
          >
            <div className="font-serif text-[18px] leading-[1.1]">
              You&rsquo;re welcome here.
            </div>
            <div className="h-1 w-[55%] rounded-[3px] bg-ink/15" />
            <div className="h-1 w-[35%] rounded-[3px] bg-ink/15" />
            <span
              className="mt-1.5 self-start rounded-full px-2.5 py-1.5 text-[9.5px] font-semibold text-white transition-colors duration-500"
              style={{ background: b.c }}
            >
              Plan your visit
            </span>
          </div>
          <div className="px-3.5 py-3">
            <div
              className="mb-2 font-mono text-[8.5px] tracking-[0.13em] transition-colors duration-500"
              style={{ color: b.c }}
            >
              THIS SUNDAY
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1 rounded-md border border-line bg-paper p-1.5"
                >
                  <div
                    className="h-8 rounded-[4px] transition-colors duration-500"
                    style={{
                      background: `color-mix(in oklab, ${b.c} 16%, var(--color-paper-2))`,
                    }}
                  />
                  <div className="h-[3px] w-[70%] rounded-[3px] bg-ink/15" />
                  <div className="h-[3px] w-[45%] rounded-[3px] bg-ink/15" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto flex items-center gap-2.5 border-t border-line px-3.5 py-3">
            <span
              className="grid h-9 w-9 flex-none place-items-center rounded-lg text-[12px] text-white transition-colors duration-500"
              style={{ background: b.c }}
            >
              {"▶"}
            </span>
            <div className="min-w-0">
              <div
                className="font-mono text-[8px] uppercase tracking-[0.13em] transition-colors duration-500"
                style={{ color: b.c }}
              >
                Latest sermon
              </div>
              <div className="truncate text-[12px] font-semibold">
                The Prodigal Son
              </div>
              <div className="text-[10px] text-muted">Pastor James · 38 min</div>
            </div>
            <span
              className="ml-auto whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold text-white transition-colors duration-500"
              style={{ background: b.c }}
            >
              Watch
            </span>
          </div>
        </div>
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="rounded-[10px] bg-paper-2 px-3 py-2.5">
            <span className="mb-2 block text-center font-mono text-[8.5px] tracking-[0.12em] text-muted">
              YOUR BRAND
            </span>
            <div className="flex justify-center gap-2">
              {BRANDS.map((x, i) => (
                <span
                  key={i}
                  className={`h-[18px] w-[18px] rounded-full transition-[scale,opacity,box-shadow] duration-300 ${
                    i === bi
                      ? "scale-110 shadow-[0_0_0_2px_var(--color-card),0_0_0_3.5px_currentColor]"
                      : "opacity-45"
                  }`}
                  style={{ background: x.c, color: x.c }}
                />
              ))}
            </div>
          </div>
          <Gauge on={on} />
          <div className="rounded-[10px] bg-paper-2 px-3 py-2.5 text-center">
            <b className="block font-serif text-xl">0.4s</b>
            <span className="font-mono text-[10px] text-muted">load time</span>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}

/* ---- 02: CMS ---- */
const CMS_SCENES = [
  {
    title: "The Prodigal Son",
    speaker: "Pastor James",
    series: "Parables",
    featured: true,
  },
  {
    title: "Rooted in Grace",
    speaker: "Pastor Dana",
    series: "Ephesians",
    featured: false,
  },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[5px]">
      <span className="text-[11px] font-semibold text-muted">{label}</span>
      <span className="flex h-9 items-center overflow-hidden rounded-lg border border-line bg-paper-2 px-[11px] py-[9px] text-[13px]">
        {children}
      </span>
    </label>
  );
}

function DemoCMS({ on }: { on: boolean }) {
  const scene = useCycle(CMS_SCENES.length, 3600, on);
  const data = CMS_SCENES[scene];
  const typed = useTypewriter(data.title, on, scene);
  return (
    <DemoFrame bar="studio &middot; sermons">
      <div className="grid grid-cols-[1fr_0.86fr] gap-4 max-[940px]:grid-cols-1">
        <div className="flex flex-col gap-[11px]">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            New sermon
          </div>
          <Field label="Title">
            <span className="inline-flex min-h-[1lh] items-center">
              {typed}
              <i className="ml-px inline-block h-3.5 w-[1.5px] animate-blink bg-accent" />
            </span>
          </Field>
          <Field label="Speaker">{data.speaker}</Field>
          <Field label="Series">{data.series}</Field>
          <div className="flex items-center justify-between px-0.5 py-1 text-[12.5px]">
            <span>Feature on homepage</span>
            <span
              className={`relative h-[22px] w-[38px] rounded-full transition-colors duration-300 ${
                data.featured ? "bg-accent" : "bg-line"
              }`}
            >
              <i
                className={`absolute left-0.5 top-0.5 block h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-300 ${
                  data.featured ? "translate-x-4" : ""
                }`}
              />
            </span>
          </div>
        </div>
        <div className="rounded-xl bg-paper-2 p-3.5">
          <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Live preview
          </div>
          <div className="relative rounded-[10px] border border-line bg-card p-3">
            {data.featured && (
              <span className="absolute right-2.5 top-2.5 rounded-full bg-accent px-[7px] py-[3px] font-mono text-[9px] text-white">
                Featured
              </span>
            )}
            <div className="mb-2.5 grid h-16 place-items-center rounded-[7px] bg-[repeating-linear-gradient(45deg,var(--color-paper-2),var(--color-paper-2)_8px,var(--color-paper-3)_8px,var(--color-paper-3)_16px)]">
              <span className="font-mono text-[11px] tracking-[0.05em] text-muted">
                sermon art
              </span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
              {data.series}
            </div>
            <div className="my-[3px] min-h-[1.1em] font-serif text-[18px] leading-[1.1]">
              {typed || "…"}
            </div>
            <div className="text-[11px] text-muted">
              {data.speaker} &middot; Sun
            </div>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}

/* ---- 03: Sync ---- */
const SYNC_ITEMS = [
  {
    t: "Sunday Worship",
    d: "Sun · 10am",
    kind: "event" as const,
    c: "#bb4a23",
  },
  { t: "Youth Night", d: "Wed · 7pm", kind: "event" as const, c: "#3a5878" },
  {
    t: "Women’s Bible Study",
    d: "Thu · 9am",
    kind: "group" as const,
    c: "#345044",
  },
  { t: "Young Adults", d: "Fri · 7pm", kind: "group" as const, c: "#8a6d2f" },
];

const SYNC_SECTIONS = [
  { label: "Events", kind: "event" as const },
  { label: "Groups", kind: "group" as const },
];

function DemoSync({ on }: { on: boolean }) {
  const [phase, setPhase] = useState(0);
  const [idx, setIdx] = useState(0);
  const [placed, setPlaced] = useState([0]);

  useEffect(() => {
    if (!on) return;
    let i = 0;
    setPlaced([0]);
    setIdx(0);
    setPhase(0);
    const loop = () => {
      i = (i + 1) % SYNC_ITEMS.length;
      setIdx(i);
      setPhase(1);
      setTimeout(() => {
        setPhase(2);
        setPlaced((p) => [...p.filter((x) => x !== i), i].slice(-4));
      }, 900);
      setTimeout(() => setPhase(0), 1500);
    };
    const t = setInterval(loop, 2400);
    return () => clearInterval(t);
  }, [on]);

  const ev = SYNC_ITEMS[idx];
  return (
    <DemoFrame bar="sync · church backend → website">
      <div className="mb-3 hidden items-center justify-center max-[940px]:flex">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-2 px-3 py-1.5 font-mono text-[9.5px] tracking-[0.1em] text-ink-soft">
          <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
          AUTO-SYNC · WEBSITE CMS
        </span>
      </div>
      <div className="grid min-h-[250px] grid-cols-[1fr_1.1fr_1fr] items-stretch gap-2.5 max-[940px]:min-h-0 max-[940px]:grid-cols-2 max-[940px]:gap-3">
        <div className="flex flex-col">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold">
            <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-ink">
              <span className="flex flex-col gap-[2.5px]">
                <i className="block h-[2px] w-3 rounded-full bg-paper" />
                <i className="block h-[2px] w-3 rounded-full bg-paper/70" />
                <i className="block h-[2px] w-3 rounded-full bg-paper/45" />
              </span>
            </span>{" "}
            Church Backend
          </div>
          {SYNC_SECTIONS.map((s) => (
            <div key={s.kind} className="mb-2.5 last:mb-0">
              <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {s.label}
              </div>
              <div className="flex flex-col gap-[7px]">
                {SYNC_ITEMS.map((e, i) =>
                  e.kind === s.kind ? (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-lg border bg-paper-2 px-2.5 py-[9px] text-xs transition-[border-color,translate] duration-300 ${
                        i === idx && phase >= 1
                          ? "translate-x-[3px] border-accent"
                          : "border-transparent"
                      }`}
                    >
                      <span
                        className="h-2 w-2 flex-none rounded-full"
                        style={{ background: e.c }}
                      />
                      <span>{e.t}</span>
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="relative flex flex-col items-center justify-center max-[940px]:hidden">
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-[repeating-linear-gradient(90deg,var(--color-line),var(--color-line)_5px,transparent_5px,transparent_11px)] max-[940px]:hidden" />
          <div
            className={`absolute left-0 top-1/2 z-[3] inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-accent bg-card px-2.5 py-[5px] text-[11px] opacity-0 shadow-[0_6px_16px_-8px_var(--color-accent)] [transform:translate(-10px,-50%)] max-[940px]:hidden ${
              phase === 1 ? "animate-pkt" : ""
            }`}
          >
            <span
              className="h-2 w-2 flex-none rounded-full"
              style={{ background: ev.c }}
            />
            {ev.t}
          </div>
          <div className="z-[2] whitespace-nowrap rounded-[10px] border border-line bg-card px-3.5 py-2.5 text-center font-mono text-xs font-bold tracking-[0.12em] text-accent">
            WEBSITE CMS
            <br />
            <small className="text-[8px] tracking-[0.1em] text-muted">
              auto-sync
            </small>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold">
            <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-accent text-[10px] font-bold text-white">
              {"↗"}
            </span>{" "}
            Your website
          </div>
          {SYNC_SECTIONS.map((s) => {
            const items = placed.filter((p) => SYNC_ITEMS[p].kind === s.kind);
            return (
              <div key={s.kind} className="mb-2.5 last:mb-0">
                <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                  {s.label}
                </div>
                <div className="flex flex-col gap-[7px]">
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-line px-2.5 py-2 font-mono text-[10px] text-muted">
                      syncing…
                    </div>
                  )}
                  {items.map((p) => {
                    const e = SYNC_ITEMS[p];
                    return (
                      <div
                        key={p}
                        className="flex animate-pop flex-col gap-px rounded-r-lg border-l-[3px] bg-paper-2 px-2.5 py-2 text-[11px]"
                        style={{ borderColor: e.c }}
                      >
                        <b
                          className="font-mono text-[9.5px]"
                          style={{ color: e.c }}
                        >
                          {e.d}
                        </b>
                        <span className="text-ink-soft">{e.t}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DemoFrame>
  );
}

/* ---- 04: The app ---- */
function FloatChip({
  className,
  label,
  text,
}: {
  className: string;
  label: string;
  text: string;
}) {
  return (
    <div
      className={`absolute z-[2] w-[156px] animate-fade-in-back rounded-xl border border-line bg-card px-3 py-2.5 shadow-[0_18px_40px_-22px_rgba(28,24,19,0.5)] max-[940px]:hidden ${className}`}
    >
      <span className="mb-1 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.12em] text-accent">
        <span className="h-[5px] w-[5px] rounded-full bg-accent" />
        {label}
      </span>
      <span className="text-[12px] leading-[1.4] text-ink-soft">{text}</span>
    </div>
  );
}

function DemoApp({ on }: { on: boolean }) {
  return (
    <div className="relative grid h-[500px] place-items-center max-[940px]:h-[440px]">
      <div className="pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,var(--color-accent-tint),transparent_72%)]" />
      <FloatChip
        className="left-0 top-[10%]"
        label="NATIVE & FAST"
        text="A true app on iOS & Android, instant and smooth."
      />
      <FloatChip
        className="right-0 top-[30%]"
        label="YOUR BRAND"
        text="Your branding and name, in both app stores."
      />
      <FloatChip
        className="bottom-[8%] left-[3%]"
        label="ONE BACKEND"
        text="Same CMS and sync as your site. Publish once."
      />
      <div className="relative w-[232px] max-[940px]:w-[204px]">
        <AppPhone on={on} deck={PUBLIC_DECK} />
      </div>
    </div>
  );
}

/* ---------- demo registry ---------- */
const DEMOS: Record<string, React.ComponentType<{ on: boolean }>> = {
  modern: DemoModern,
  cms: DemoCMS,
  sync: DemoSync,
  app: DemoApp,
};

/* ---------- page visuals (feature 01) ---------- */
const PANEL = "h-[360px]"; // every feature-01 visual matches the default panel

/* a framed "church page" wrapper shared by every feature-01 visual */
function PageShell({
  bar,
  title,
  sub,
  children,
}: {
  bar: string;
  title?: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <DemoFrame bar={bar}>
      <div
        className={`flex flex-col overflow-hidden rounded-xl border border-line bg-card ${PANEL}`}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5">
          <b className="font-serif text-[13px] leading-none text-accent">
            Grace Community
          </b>
          <span className="ml-auto flex gap-1.5">
            <i className="block h-1 w-5 rounded-[2px] bg-line" />
            <i className="block h-1 w-5 rounded-[2px] bg-line" />
            <i className="block h-1 w-5 rounded-[2px] bg-line" />
          </span>
          <span className="rounded-full bg-accent px-2.5 py-1 text-[9px] font-semibold text-white">
            Visit
          </span>
        </div>
        <div className="flex flex-1 flex-col px-4 py-3">
          {title && (
            <div className="mb-2.5">
              <div className="font-sans text-[15px] font-bold leading-tight tracking-[-0.01em]">
                {title}
              </div>
              {sub && (
                <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.13em] text-muted">
                  {sub}
                </div>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </DemoFrame>
  );
}

const TRACK = [
  {
    k: "Engage",
    sub: "Culture & community",
    v: "A first step into the life of the church — discovering what it means to follow Jesus here.",
    items: ["Discover Discipleship", "Welcome Lunch"],
  },
  {
    k: "Establish",
    sub: "Biblical foundations",
    v: "Laying strong foundations in faith, Scripture, and spiritual family.",
    items: ["Foundations Class", "Baptism", "Join a Group"],
  },
  {
    k: "Equip",
    sub: "Believers to minister",
    v: "Growing in the gifts to serve others and take ownership in the church.",
    items: ["Serve Team Training", "Spiritual Gifts"],
  },
  {
    k: "Empower",
    sub: "Disciples to make disciples",
    v: "Sending mature disciples out to lead, disciple others, and multiply.",
    items: ["Leadership Cohort", "Disciple-Making 101"],
  },
];

function DemoTrack() {
  const active = useCycle(TRACK.length, 2600, true);
  const a = TRACK[active];
  const R = 38;
  const C = 2 * Math.PI * R;
  const segLen = (C * 80) / 360;
  return (
    <PageShell
      bar="gracecommunity.example/discipleship"
      title="Your Discipleship Journey"
      sub="A clear path to follow Jesus"
    >
      <div className="grid flex-1 grid-cols-[0.85fr_1.15fr] items-center gap-3.5">
        {/* ring + legend */}
        <div className="flex h-full flex-col items-center justify-center gap-2.5">
          <div className="relative aspect-square w-full max-w-[136px]">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              {TRACK.map((_, i) => (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  strokeWidth="13"
                  stroke={
                    i === active
                      ? "var(--color-accent)"
                      : "var(--color-line-2)"
                  }
                  strokeDasharray={`${segLen} ${C - segLen}`}
                  transform={`rotate(${-135 + i * 90} 50 50)`}
                  style={{ transition: "stroke .4s ease" }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid aspect-square w-[40%] place-items-center rounded-full bg-card text-center shadow-[0_2px_10px_-4px_rgba(28,24,19,0.25)]">
                <div>
                  <div className="font-serif text-[17px] leading-none text-accent">
                    {active + 1}
                  </div>
                  <div className="font-mono text-[6px] tracking-[0.15em] text-muted">
                    OF 4
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {TRACK.map((t, i) => (
              <span
                key={i}
                className={`rounded-full px-2 py-[3px] font-mono text-[8px] uppercase tracking-[0.06em] transition-colors duration-300 ${
                  i === active
                    ? "bg-accent text-white"
                    : "bg-paper-2 text-ink-soft"
                }`}
              >
                {t.k}
              </span>
            ))}
          </div>
        </div>
        {/* active stage detail */}
        <div key={active} className="flex animate-fade-in-back flex-col">
          <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em]">
            <span className="font-semibold text-accent">Stage {active + 1}</span>
            <span className="text-muted">{a.sub}</span>
          </div>
          <div className="font-serif text-[19px] leading-[1.1]">{a.k}</div>
          <p className="mt-1.5 text-[11.5px] leading-[1.5] text-ink-soft">
            {a.v}
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {a.items.map((it) => (
              <div
                key={it}
                className="flex items-center gap-2 rounded-lg border border-line bg-paper-2 px-2.5 py-1.5 text-[11px]"
              >
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-accent" />
                {it}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* bottom next-step band */}
      <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-accent/25 bg-accent-tint px-3 py-2.5">
        <div className="min-w-0">
          <span className="block font-mono text-[8px] uppercase tracking-[0.13em] text-accent">
            Your next step
          </span>
          <b className="text-[12px]">{a.items[0]}</b>
        </div>
        <span className="ml-auto whitespace-nowrap rounded-full bg-accent px-3 py-1.5 text-[10px] font-semibold text-white">
          Sign up →
        </span>
      </div>
    </PageShell>
  );
}

/* ---- Custom Sermon Experience ---- */
const SLIDE_COUNT = 7;

function DemoSermons() {
  const slide = useCycle(SLIDE_COUNT, 1500, true);
  return (
    <PageShell bar="gracecommunity.example/sermons">
      <div className="flex flex-1 flex-col gap-2.5">
        <div className="grid flex-1 grid-cols-[1.35fr_1fr] gap-2.5">
          {/* video */}
          <div className="relative grid place-items-center overflow-hidden rounded-xl bg-[repeating-linear-gradient(45deg,var(--color-paper-2),var(--color-paper-2)_9px,var(--color-paper-3)_9px,var(--color-paper-3)_18px)]">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-[15px] text-white shadow-[0_6px_16px_-6px_rgba(28,24,19,0.6)]">
              {"▶"}
            </span>
            <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 bg-gradient-to-t from-ink/60 to-transparent px-3 pb-2 pt-7">
              <div className="min-w-0">
                <div className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-white/75">
                  Parables
                </div>
                <div className="font-serif text-[13px] leading-tight text-white">
                  The Prodigal Son
                </div>
              </div>
              <span className="ml-auto whitespace-nowrap font-mono text-[8px] text-white/70">
                12:04 / 38:00
              </span>
            </div>
          </div>
          {/* notes */}
          <div className="flex flex-col rounded-xl border border-line bg-paper-2 p-2.5">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
                My notes
              </span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-line bg-card px-2 py-[3px] font-mono text-[7.5px] uppercase tracking-[0.06em] text-ink-soft">
                ↓ Download
              </span>
            </div>
            <div className="flex flex-col gap-1.5 text-[10px] leading-[1.45] text-ink-soft">
              <div className="flex gap-1.5">
                <span className="text-accent">•</span> Grace runs to meet us
              </div>
              <div className="flex gap-1.5">
                <span className="text-accent">•</span> The father saw him &ldquo;far
                off&rdquo;
              </div>
              <div className="h-1.5 w-[82%] rounded-[3px] bg-ink/10" />
              <div className="flex items-center">
                <span className="h-1.5 w-[52%] rounded-[3px] bg-ink/10" />
                <i className="ml-px inline-block h-3 w-[1.5px] animate-blink bg-accent" />
              </div>
            </div>
          </div>
        </div>
        {/* slides row */}
        <div>
          <span className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
            Slides
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <div
                key={i}
                className={`grid h-9 flex-1 place-items-center rounded-md border font-mono text-[8px] transition-colors duration-300 ${
                  i === slide
                    ? "border-accent bg-accent-tint text-accent"
                    : "border-line bg-card text-muted"
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/* ---- Custom Small Groups Finder ---- */
const GROUPS = [
  { name: "Tuesday Women's", when: "Tue · 7:00pm", host: "Beth" },
  { name: "Men's Breakfast", when: "Sat · 8:00am", host: "Carlos" },
  { name: "Young Adults", when: "Fri · 7:00pm", host: "Priya" },
  { name: "Downtown Group", when: "Wed · 6:30pm", host: "Marcus" },
];
const GROUP_FILTERS = ["All Days", "Mornings", "Evenings", "Childcare"];
const MAP_PINS = [
  "left-[20%] top-[26%]",
  "left-[44%] top-[20%]",
  "left-[66%] top-[32%]",
  "left-[32%] top-[54%]",
  "left-[56%] top-[60%]",
  "left-[76%] top-[52%]",
];

function DemoGroups() {
  const v = useCycle(2, 3200, true);
  const view = v === 0 ? "list" : "map";
  return (
    <PageShell
      bar="gracecommunity.example/groups"
      title="Find a Group"
      sub="Community near you"
    >
      <div className="flex flex-1 flex-col gap-2.5">
        {/* toolbar: filters + view toggle */}
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {GROUP_FILTERS.map((t, i) => (
              <span
                key={t}
                className={`whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.05em] ${
                  i === 0 ? "bg-accent text-white" : "bg-paper-2 text-ink-soft"
                }`}
              >
                {t}
              </span>
            ))}
          </div>
          <div className="ml-auto flex flex-none rounded-full border border-line bg-paper-2 p-0.5 font-mono text-[8px] uppercase tracking-[0.06em]">
            <span
              className={`rounded-full px-2.5 py-1 transition-colors duration-300 ${
                view === "list"
                  ? "bg-card text-ink shadow-[0_1px_3px_rgba(28,24,19,0.15)]"
                  : "text-muted"
              }`}
            >
              List
            </span>
            <span
              className={`rounded-full px-2.5 py-1 transition-colors duration-300 ${
                view === "map"
                  ? "bg-card text-ink shadow-[0_1px_3px_rgba(28,24,19,0.15)]"
                  : "text-muted"
              }`}
            >
              Map
            </span>
          </div>
        </div>
        {/* content: list or map */}
        {view === "list" ? (
          <div
            key="list"
            className="flex flex-1 animate-fade-in-back flex-col gap-2"
          >
            {GROUPS.map((g) => (
              <div
                key={g.name}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold">{g.name}</div>
                  <div className="text-[10px] text-muted">
                    {g.when} · Hosted by {g.host}
                  </div>
                </div>
                <span className="ml-auto whitespace-nowrap rounded-full bg-accent px-3 py-1.5 text-[10px] font-semibold text-white">
                  Join
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            key="map"
            className="relative flex-1 animate-fade-in-back overflow-hidden rounded-xl border border-line bg-paper-3"
          >
            <div className="absolute inset-0 opacity-70">
              <div className="absolute inset-x-0 top-1/3 h-px bg-line" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-line" />
              <div className="absolute inset-y-0 left-1/4 w-px bg-line" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-line" />
            </div>
            {MAP_PINS.map((p, i) => (
              <span
                key={i}
                className={`absolute ${p} -translate-x-1/2 -translate-y-1/2`}
              >
                <span className="block h-3 w-3 rotate-45 rounded-full rounded-bl-none bg-accent shadow-[0_3px_6px_-2px_rgba(28,24,19,0.5)]" />
              </span>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

/* ---- Built In Custom Giving ---- */
const AMOUNTS = ["$25", "$50", "$100", "$250"];

function DemoGiving() {
  const sel = useCycle(AMOUNTS.length, 2200, true);
  return (
    <PageShell
      bar="gracecommunity.example/give"
      title="Give"
      sub="Secure, simple generosity"
    >
      <div className="flex flex-1 flex-col gap-2.5">
        <div className="flex gap-1.5">
          <span className="rounded-full bg-ink px-3 py-1 text-[9px] font-semibold text-paper">
            One-time
          </span>
          <span className="rounded-full bg-paper-2 px-3 py-1 text-[9px] font-semibold text-ink-soft">
            Monthly
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {AMOUNTS.map((amt, i) => (
            <div
              key={amt}
              className={`grid place-items-center rounded-xl border py-3 font-serif text-[18px] transition-colors duration-300 ${
                i === sel
                  ? "border-accent bg-accent-tint text-accent"
                  : "border-line bg-card text-ink"
              }`}
            >
              {amt}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-line bg-paper-2 px-3 py-2 text-[11px]">
          <span className="text-muted">Fund</span>
          <span className="font-medium">General Fund ▾</span>
        </div>
        <div className="mt-auto grid place-items-center rounded-xl bg-accent py-2.5 text-[12px] font-semibold text-white">
          Give {AMOUNTS[sel]} →
        </div>
        <div className="flex items-center justify-center gap-1.5 font-mono text-[8.5px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3a6a4e]" />
          Secured &amp; encrypted
        </div>
      </div>
    </PageShell>
  );
}

/* ---- Custom Class Pages ---- */
const LESSONS = [
  "Introduction",
  "Engage Culture & Community",
  "Establish Biblical Foundations",
  "Equip Believers to Minister",
  "Empower Disciples",
  "Conclusion",
];
const CLASS_STEPS: [string, string][] = [
  ["1", "Watch the class videos"],
  ["2", "Complete the worksheet"],
  ["3", "Attend a 90-min session"],
];

function DemoClasses() {
  const open = useCycle(LESSONS.length, 2200, true);
  return (
    <PageShell bar="gracecommunity.example/classes">
      <div className="grid flex-1 grid-cols-[1fr_1.05fr] gap-3.5">
        {/* class content */}
        <div className="flex flex-col justify-center">
          <div className="font-sans text-[15px] font-bold leading-tight tracking-[-0.01em]">
            What is Making Disciples?
          </div>
          <p className="mt-1.5 text-[10.5px] leading-[1.5] text-ink-soft">
            Every disciple is called to make disciples. This class equips you to
            engage others with the gospel and establish new believers.
          </p>
          <span className="mt-3 font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
            How it works
          </span>
          <div className="mt-2 flex flex-col gap-2">
            {CLASS_STEPS.map(([n, t]) => (
              <div key={n} className="flex items-center gap-2 text-[10.5px]">
                <span className="grid h-4 w-4 flex-none place-items-center rounded-full bg-paper-2 font-mono text-[8px] text-ink-soft">
                  {n}
                </span>
                {t}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[9.5px] font-semibold text-paper">
              ↓ Class PDF
            </span>
            <span className="whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-[9.5px] font-semibold text-ink-soft">
              Sign up
            </span>
          </div>
        </div>
        {/* lessons accordion */}
        <div className="flex flex-col">
          <span className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
            Video lessons
          </span>
          <div className="flex flex-col overflow-hidden rounded-xl border border-line">
            {LESSONS.map((l, i) => (
              <div
                key={l}
                className={`border-b border-line last:border-b-0 ${
                  i === open ? "bg-paper-2" : "bg-card"
                }`}
              >
                <div className="flex items-center gap-2 px-2.5 py-[7px]">
                  <span
                    className={`grid h-4 w-4 flex-none place-items-center rounded-full font-mono text-[8px] transition-colors duration-300 ${
                      i === open
                        ? "bg-accent text-white"
                        : "bg-paper-2 text-ink-soft"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-[10px] font-medium">{l}</span>
                  <span
                    className={`ml-auto text-[8px] text-muted transition-transform duration-300 ${
                      i === open ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </div>
                {i === open && (
                  <div className="px-2.5 pb-2.5">
                    <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-2 py-1.5">
                      <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-accent text-[9px] text-white">
                        {"▶"}
                      </span>
                      <div className="h-1 flex-1 rounded-full bg-line">
                        <div className="h-1 w-1/4 rounded-full bg-accent" />
                      </div>
                      <span className="whitespace-nowrap font-mono text-[7.5px] text-muted">
                        0:00 / 41:40
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/* ---- Whatever You Dream Of ---- */
const DREAMS = [
  "Prayer Wall",
  "Missions Map",
  "Devotional Plans",
  "Event Hub",
  "Volunteer Signups",
];

function DemoDream() {
  const d = useCycle(DREAMS.length, 1900, true);
  return (
    <PageShell
      bar="gracecommunity.example"
      title="Whatever You Dream Of"
      sub="If you can imagine it, we build it"
    >
      <div className="grid flex-1 grid-cols-[0.9fr_1.1fr] items-center gap-3">
        <div className="flex flex-col gap-1.5">
          {DREAMS.map((t, i) => (
            <div
              key={t}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors duration-300 ${
                i === d
                  ? "border-accent bg-accent-tint font-medium text-accent"
                  : "border-line bg-card text-ink-soft"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 flex-none rounded-full ${
                  i === d ? "bg-accent" : "bg-line-2"
                }`}
              />
              {t}
            </div>
          ))}
        </div>
        <div
          key={d}
          className="flex animate-fade-in-back flex-col rounded-xl border border-line bg-paper-2 p-3"
        >
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-accent">
            Custom build
          </span>
          <div className="mt-1 font-serif text-[16px] leading-[1.1]">
            {DREAMS[d]}
          </div>
          <div className="mt-2.5 flex flex-col gap-1.5">
            <div className="h-1.5 w-[80%] rounded-[3px] bg-ink/10" />
            <div className="h-1.5 w-[60%] rounded-[3px] bg-ink/10" />
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <div className="h-9 rounded-md border border-line bg-card" />
              <div className="h-9 rounded-md border border-line bg-card" />
              <div className="h-9 rounded-md border border-line bg-card" />
            </div>
          </div>
          <span className="mt-2.5 self-start font-mono text-[9px] uppercase tracking-[0.1em] text-accent">
            + build it
          </span>
        </div>
      </div>
    </PageShell>
  );
}

/* index-aligned with feature 01's `pages` array in data.ts */
const PAGE_VISUALS = [
  DemoTrack,
  DemoSermons,
  DemoGroups,
  DemoGiving,
  DemoClasses,
  DemoDream,
];

/* ---------- app page visuals (feature 02) ---------- */
/* the phone frame stays put; only the screen inside swaps per accordion item */
function AppMock({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid h-[500px] place-items-center max-[940px]:h-[440px]">
      <div className="pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,var(--color-accent-tint),transparent_72%)]" />
      <div className="relative w-[232px] max-[940px]:w-[204px]">
        <PhoneShell>{children}</PhoneShell>
      </div>
    </div>
  );
}

const AppTrack = () => (
  <AppMock>
    <ScreenJourney />
  </AppMock>
);
const AppPush = () => (
  <AppMock>
    <ScreenPush />
  </AppMock>
);
const AppSermon = () => (
  <AppMock>
    <ScreenSermon />
  </AppMock>
);
const AppGroups = () => (
  <AppMock>
    <ScreenGroupsMap />
  </AppMock>
);
const AppGiving = () => (
  <AppMock>
    <ScreenGive />
  </AppMock>
);
const AppDream = () => (
  <AppMock>
    <ScreenDream />
  </AppMock>
);

/* index-aligned with feature 02's `pages` array in data.ts */
const APP_PAGE_VISUALS = [
  AppTrack,
  AppPush,
  AppSermon,
  AppGroups,
  AppGiving,
  AppDream,
];

const PAGE_VISUALS_BY_FEATURE: Record<string, React.ComponentType[]> = {
  modern: PAGE_VISUALS,
  app: APP_PAGE_VISUALS,
};

/* ---------- page accordion (feature 01) ---------- */
function PageIcon({ name }: { name?: string }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "track": // flag / milestone
      return (
        <svg {...common}>
          <path d="M6 21V4" />
          <path d="M6 4h11l-2.2 3.2L17 10.5H6" />
        </svg>
      );
    case "sermon": // play
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M10.5 9.2l4.2 2.8-4.2 2.8z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "groups": // map pin
      return (
        <svg {...common}>
          <path d="M12 21c4.5-4 7-7 7-10a7 7 0 0 0-14 0c0 3 2.5 6 7 10z" />
          <circle cx="12" cy="11" r="2.4" />
        </svg>
      );
    case "giving": // heart
      return (
        <svg {...common}>
          <path d="M12 20s-6.5-4.3-6.5-9A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 6.5 3c0 4.7-6.5 9-6.5 9z" />
        </svg>
      );
    case "class": // open book
      return (
        <svg {...common}>
          <path d="M12 6.5S9.5 5 5 5v12.5c4.5 0 7 1.5 7 1.5s2.5-1.5 7-1.5V5c-4.5 0-7 1.5-7 1.5z" />
          <path d="M12 6.5V19" />
        </svg>
      );
    case "push": // bell
      return (
        <svg {...common}>
          <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4.5 1.8 5.8 1.8 5.8H4.7s1.8-1.3 1.8-5.8z" />
          <path d="M10 18.5a2 2 0 0 0 4 0" />
        </svg>
      );
    case "dream": // sparkle
      return (
        <svg {...common}>
          <path
            d="M12 3.5c.5 4 1.5 5 5.5 5.5-4 .5-5 1.5-5.5 5.5-.5-4-1.5-5-5.5-5.5 4-.5 5-1.5 5.5-5.5z"
            fill="currentColor"
            stroke="none"
          />
          <path
            d="M18.5 14.5c.2 1.7.7 2.2 2.5 2.5-1.8.3-2.3.8-2.5 2.5-.2-1.7-.7-2.2-2.5-2.5 1.8-.3 2.3-.8 2.5-2.5z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );
  }
}

function PagesAccordion({
  pages,
  open,
  setOpen,
}: {
  pages: { title: string; blurb: string; href?: string; icon?: string }[];
  open: number | null;
  setOpen: (v: number | null) => void;
}) {
  return (
    <div className="mt-7 border-t border-line">
      {pages.map((pg, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="border-b border-line">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 py-3.5 text-left"
            >
              <span
                className={`grid h-7 w-7 flex-none place-items-center rounded-[9px] transition-colors duration-300 ${
                  isOpen
                    ? "bg-accent text-white"
                    : "bg-accent-tint text-accent"
                }`}
              >
                <PageIcon name={pg.icon} />
              </span>
              <span className="text-[15px] font-medium">{pg.title}</span>
              <span
                className={`ml-auto grid h-5 w-5 flex-none place-items-center rounded-full bg-accent-tint text-[15px] leading-none text-accent transition-transform duration-300 ${
                  isOpen ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pb-4">
                  <p className="text-[14.5px] leading-[1.6] text-ink-soft">
                    {pg.blurb}
                  </p>
                  {pg.href && (
                    <a
                      href={pg.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-accent transition-opacity hover:opacity-70"
                    >
                      View this page <span>{"↗"}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Feature row ---------- */
function FeatureRow({
  f,
  i,
}: {
  f: (typeof DATA.features)[number];
  i: number;
}) {
  const [ref, inView] = useInView();
  const [openPage, setOpenPage] = useState<number | null>(null);
  const Demo = DEMOS[f.id];
  const flip = i % 2 === 1;
  const hasPages = f.pages.length > 0;
  return (
    <div
      ref={ref}
      className="grid grid-cols-[0.82fr_1.18fr] items-center gap-16 max-[940px]:grid-cols-1 max-[940px]:gap-[30px]"
    >
      <div
        className={`flex flex-col transition-[opacity,translate] duration-700 max-[940px]:translate-y-0 max-[940px]:opacity-100 ${
          flip ? "min-[941px]:order-2" : ""
        } ${inView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
      >
        <div className="mb-[18px] flex items-center gap-3 font-mono text-[13px] text-muted after:h-px after:flex-1 after:bg-line after:content-['']">
          {f.n && <span className="font-semibold text-accent">{f.n}</span>}
          <em className="text-[11.5px] not-italic uppercase tracking-[0.14em]">
            {f.tag}
          </em>
        </div>
        <h3 className="font-serif text-[clamp(30px,3vw,36px)] leading-[1.04] tracking-[-0.02em] [font-weight:460]">
          {f.title}
        </h3>
        <p className="mt-[18px] text-[16.5px] leading-[1.6] text-ink-soft">
          {f.body}
        </p>
        {hasPages && (
          <PagesAccordion
            pages={f.pages}
            open={openPage}
            setOpen={setOpenPage}
          />
        )}
        {f.points.length > 0 && (
          <ul className="mt-6 flex list-none flex-col gap-[11px]">
            {f.points.map((p, k) => (
              <li
                key={k}
                className="flex items-center gap-[11px] text-[15px] font-medium"
              >
                <span className="grid h-[21px] w-[21px] place-items-center rounded-full bg-accent-tint text-[11px] text-accent">
                  {"✓"}
                </span>
                {p}
              </li>
            ))}
          </ul>
        )}
        {f.cta && (
          <Btn
            href={
              (hasPages &&
                openPage !== null &&
                f.pages[openPage].href) ||
              f.cta.href
            }
            target="_blank"
            rel="noreferrer"
            className="mt-7 self-start min-[941px]:hidden"
          >
            {f.cta.label} <span>{"↗"}</span>
          </Btn>
        )}
      </div>
      <div
        className={`flex flex-col transition-[opacity,translate,scale] duration-[800ms] max-[940px]:translate-y-0 max-[940px]:scale-100 max-[940px]:overflow-x-auto max-[940px]:opacity-100 ${
          flip ? "min-[941px]:order-1" : ""
        } ${
          inView
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-6 scale-[0.985] opacity-0"
        }`}
      >
        {hasPages ? (
          openPage === null ? (
            Demo ? (
              <Demo on={inView} />
            ) : null
          ) : (
            (() => {
              const visuals = PAGE_VISUALS_BY_FEATURE[f.id] ?? [];
              const PageVisual = visuals[openPage];
              if (PageVisual) return <PageVisual />;
              return Demo ? <Demo on={inView} /> : null;
            })()
          )
        ) : (
          Demo && <Demo on={inView} />
        )}
        {f.cta && (
          <Btn
            href={
              (hasPages &&
                openPage !== null &&
                f.pages[openPage].href) ||
              f.cta.href
            }
            target="_blank"
            rel="noreferrer"
            className="mt-6 self-start max-[940px]:hidden"
          >
            {f.cta.label} <span>{"↗"}</span>
          </Btn>
        )}
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-[88px] bg-paper py-[120px] max-[720px]:py-[78px]"
    >
      <Wrap>
        <div className="mb-20 max-w-[760px]">
          <Eyebrow>So we started building</Eyebrow>
          <SecTitle>
            First, the foundation — a custom website your staff can easily run,{" "}
            <em className="italic text-accent">
              synced to the tools you already use.
            </em>
          </SecTitle>
        </div>

        <div className="flex flex-col gap-[130px] max-[940px]:gap-[90px]">
          {DATA.features.map((f, i) => (
            <FeatureRow key={f.id} f={f} i={i} />
          ))}
        </div>
      </Wrap>
    </section>
  );
}
