"use client";

import { useState, useEffect, useRef } from "react";
import { DATA } from "@/app/data";
import { Btn, Eyebrow, SecTitle, TrafficLights, Wrap } from "@/app/components/ui";

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
      <div className="grid grid-cols-[1fr_120px] gap-4 max-[940px]:grid-cols-[1fr_100px]">
        {/* the mini site, re-skinned by whichever brand is active */}
        <div className="flex min-h-[270px] flex-col overflow-hidden rounded-xl border border-line bg-card">
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
          <div className="flex-1 px-3.5 py-3">
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
        </div>
        <div className="flex flex-col gap-3">
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

/* ---------- demo registry ---------- */
const DEMOS: Record<string, React.ComponentType<{ on: boolean }>> = {
  modern: DemoModern,
  cms: DemoCMS,
  sync: DemoSync,
};

/* ---------- Feature row ---------- */
function FeatureRow({
  f,
  i,
}: {
  f: (typeof DATA.features)[number];
  i: number;
}) {
  const [ref, inView] = useInView();
  const Demo = DEMOS[f.id];
  const flip = i % 2 === 1;
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
        {f.cta && (
          <Btn
            href={f.cta.href}
            target="_blank"
            rel="noreferrer"
            className="mt-7 self-start"
          >
            {f.cta.label} <span>{"↗"}</span>
          </Btn>
        )}
      </div>
      <div
        className={`transition-[opacity,translate,scale] duration-[800ms] max-[940px]:translate-y-0 max-[940px]:scale-100 max-[940px]:overflow-x-auto max-[940px]:opacity-100 ${
          flip ? "min-[941px]:order-1" : ""
        } ${
          inView
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-6 scale-[0.985] opacity-0"
        }`}
      >
        {Demo && <Demo on={inView} />}
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
