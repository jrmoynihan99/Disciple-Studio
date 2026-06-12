"use client";

import { useEffect, useRef, useState } from "react";
import { DATA } from "@/app/data";
import { Arrow, Btn, Eyebrow, TrafficLights, Wrap } from "@/app/components/ui";

const STRIPES =
  "bg-[repeating-linear-gradient(45deg,var(--color-paper-2),var(--color-paper-2)_10px,var(--color-paper-3)_10px,var(--color-paper-3)_20px)]";

/* ---------- in-view + phase machinery ---------- */
function useInView() {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

const SEQ = [
  { name: "public", ms: 3400 },
  { name: "signin", ms: 1900 },
  { name: "personal", ms: 9200 },
] as const;
type Phase = (typeof SEQ)[number]["name"];

function usePhase(on: boolean) {
  const [idx, setIdx] = useState(0);
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setTimeout(
      () => setIdx((v) => (v + 1) % SEQ.length),
      SEQ[idx].ms,
    );
    return () => clearTimeout(t);
  }, [on, idx]);
  useEffect(() => {
    if (SEQ[idx].name === "personal") setCycle((c) => c + 1);
  }, [idx]);
  return { phase: SEQ[idx].name as Phase, setIdx, cycle };
}

/* ---------- the pathway (inside the dashboard) ---------- */
const PATH = [
  "Attend a Sunday gathering",
  "Get baptized",
  "Join a community group",
  "Take the membership class",
  "Find a place to serve",
];

function Pathway({ prog }: { prog: number }) {
  const state = (i: number): "done" | "now" | "next" =>
    i < 2 && prog > i ? "done" : i === 2 && prog >= 3 ? "now" : "next";
  const fill = [10, 30, 50, 50][Math.min(prog, 3)];
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <span className="mb-3 block font-mono text-[9.5px] tracking-[0.13em] text-muted">
        YOUR PATHWAY
      </span>
      <div className="relative">
        <div className="absolute bottom-[19px] left-[9px] top-[19px] w-[2px] rounded-full bg-line-2" />
        <div
          className="absolute left-[9px] top-[19px] w-[2px] rounded-full bg-accent transition-[height] duration-500 ease-out"
          style={{ height: `calc((100% - 38px) * ${fill} / 100)` }}
        />
        <div className="flex flex-col">
          {PATH.map((t, i) => {
            const s = state(i);
            return (
              <div
                key={i}
                className={`relative flex items-center gap-2.5 rounded-[9px] px-0 py-[7px] text-[13px] transition-colors duration-300 ${
                  s === "done" ? "text-muted" : ""
                }`}
              >
                <span
                  className={`relative z-[1] grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] transition-colors duration-300 ${
                    s === "done"
                      ? "bg-[#3a6a4e] text-white"
                      : s === "now"
                        ? "animate-pulse-dot bg-accent text-white"
                        : "bg-card shadow-[inset_0_0_0_2px_var(--color-line)]"
                  }`}
                >
                  {s === "done" && <span className="animate-pop">✓</span>}
                  {s === "now" && <span className="animate-pop">→</span>}
                </span>
                <span
                  className={`flex-1 ${s === "done" ? "line-through" : ""} ${
                    s === "now" ? "font-semibold" : ""
                  }`}
                >
                  {t}
                </span>
                {s === "now" && (
                  <span className="animate-pop font-mono text-[9px] text-accent">
                    YOU&rsquo;RE HERE
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- the three screens ---------- */
function PublicSite({ phase }: { phase: Phase }) {
  const line = "rounded-[3px] bg-ink/18";
  const navBar = "block h-1 w-[26px] rounded-[2px] bg-line";
  return (
    <div
      className={`absolute inset-0 z-[1] flex flex-col bg-paper transition-opacity duration-700 ${
        phase === "personal" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-line bg-card px-5 py-3">
        <b className="font-serif text-[15px]">Grace</b>
        <span className="ml-3 flex gap-2">
          <i className={navBar} />
          <i className={navBar} />
          <i className={navBar} />
        </span>
        <span
          className={`ml-auto rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-300 ${
            phase === "signin"
              ? "bg-accent text-white shadow-[0_0_0_4px_var(--color-accent-tint)]"
              : "bg-ink text-paper"
          }`}
        >
          Sign in
        </span>
      </div>
      <div className={`flex flex-col gap-2.5 px-5 pb-7 pt-8 ${STRIPES}`}>
        <div className="font-serif text-[26px] leading-[1.05]">
          You&rsquo;re welcome here.
        </div>
        <div className={`h-1.5 w-[58%] ${line}`} />
        <div className={`h-1.5 w-[38%] ${line}`} />
        <span className="mt-2 self-start rounded-full bg-ink px-3.5 py-2 text-[11px] text-paper">
          Plan your visit
        </span>
      </div>
      <div className="flex flex-1 flex-col px-5 py-5">
        <div className="mb-3 font-mono text-[9px] tracking-[0.14em] text-accent">
          THIS SUNDAY
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-1.5 rounded-lg border border-line bg-card p-2.5"
            >
              <div className="h-12 rounded-md bg-paper-3" />
              <div className={`h-1 w-[72%] ${line}`} />
              <div className={`h-1 w-[46%] ${line}`} />
            </div>
          ))}
        </div>
        <div className="mt-5 hidden max-[640px]:block">
          <div className="mb-3 font-mono text-[9px] tracking-[0.14em] text-accent">
            UPCOMING
          </div>
          <div className="flex flex-col gap-2">
            {[
              ["Sun · 10am", "Worship Gathering"],
              ["Wed · 7pm", "Youth Night"],
              ["Sat · 9am", "Men’s Breakfast"],
            ].map(([when, what], i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-2.5"
              >
                <span className="font-mono text-[9.5px] text-accent">
                  {when}
                </span>
                <span className="text-xs text-ink-soft">{what}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 hidden max-[640px]:block">
          <div className="mb-3 font-mono text-[9px] tracking-[0.14em] text-accent">
            LATEST SERMON
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-3">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-accent text-[10px] text-white">
              {"▶"}
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-xs font-semibold">The Prodigal Son</span>
              <span className="text-[10.5px] text-muted">
                Parables · Pastor James
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignInOverlay() {
  return (
    <div className="absolute inset-0 z-[2] grid place-items-center bg-ink/25">
      <div className="flex w-[260px] animate-pop flex-col gap-3 rounded-2xl border border-line bg-card px-6 py-7 text-center shadow-[0_30px_56px_-24px_rgba(28,24,19,0.55)]">
        <div className="font-serif text-[28px] leading-none">Grace</div>
        <div className="mb-1 text-xs text-muted">Member sign in</div>
        <div className="flex items-center rounded-[9px] border border-line bg-paper-2 px-3 py-[10px] text-left font-mono text-xs text-ink-soft">
          sarah@email.com
          <i className="ml-px inline-block h-3 w-[1.5px] animate-blink bg-accent" />
        </div>
        <div className="rounded-[9px] border border-line bg-paper-2 px-3 py-[10px] text-left font-mono text-xs text-muted">
          ••••••••
        </div>
        <div className="mt-1 rounded-[9px] bg-accent p-[10px] text-[13px] font-semibold text-white">
          Sign in
        </div>
      </div>
    </div>
  );
}

function Dashboard({ prog, cycle }: { prog: number; cycle: number }) {
  const label = "mb-2.5 block font-mono text-[9.5px] tracking-[0.13em] text-muted";
  const d = (ms: number) => ({ animationDelay: ms + "ms" });
  return (
    <div key={cycle} className="flex flex-col gap-4 p-5 max-[640px]:p-4">
      <div className="flex animate-fade-in-back items-center gap-3 border-b border-line pb-3">
        <b className="font-serif text-[15px]">Grace</b>
        <span className="ml-3 flex gap-2">
          <i className="block h-1 w-[26px] rounded-[2px] bg-line" />
          <i className="block h-1 w-[26px] rounded-[2px] bg-line" />
          <i className="block h-1 w-[26px] rounded-[2px] bg-line" />
        </span>
        <span className="ml-auto hidden items-center gap-2 rounded-full bg-paper-2 px-3 py-1.5 font-mono text-[9.5px] tracking-[0.06em] text-ink-soft min-[640px]:inline-flex">
          <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
          SYNCED · PLANNING CENTER
        </span>
        <span className="flex items-center gap-2 text-[13px] font-medium">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white">
            S
          </span>
          Sarah
        </span>
      </div>
      <div
        className="animate-fade-in-back text-[24px] tracking-[-0.01em]"
        style={d(120)}
      >
        Welcome back, <b className="font-serif text-accent">Sarah.</b>
      </div>
      <div className="grid grid-cols-[1.3fr_0.95fr] gap-3.5 max-[640px]:grid-cols-1">
        <div className="animate-fade-in-back" style={d(240)}>
          <Pathway prog={prog} />
        </div>
        <div className="flex flex-col gap-3.5">
          <div className="animate-fade-in-back rounded-xl bg-paper-2 p-4" style={d(360)}>
            <span className={label}>YOUR GROUP</span>
            <div className="mb-[3px] text-[15px] font-semibold">
              Tuesday Women&rsquo;s Group
            </div>
            <div className="text-xs text-muted">
              Next: Tue 7:00pm · Hosted by Beth
            </div>
            <div className="mt-2.5 flex">
              {["B", "S", "M", "+5"].map((a, i) => (
                <span
                  key={i}
                  className={`-ml-1.5 grid h-6 w-6 place-items-center rounded-full text-[9px] font-semibold first:ml-0 ${
                    a.startsWith("+")
                      ? "bg-paper-3 text-ink-soft"
                      : "bg-ink text-paper"
                  } ring-2 ring-paper-2`}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
          <div
            className="animate-fade-in-back rounded-xl bg-accent-tint p-4 max-[640px]:hidden"
            style={d(480)}
          >
            <span className={label}>THIS YEAR</span>
            <div className="mb-1 font-serif text-[24px] leading-none text-accent">
              $1,240
            </div>
            <div className="text-xs text-muted">in generosity · thank you</div>
          </div>
        </div>
      </div>
      <div
        className="flex animate-fade-in-back items-center gap-3 rounded-xl border border-accent/25 bg-accent-tint px-4 py-3.5 max-[640px]:flex-col max-[640px]:items-start"
        style={d(640)}
      >
        <div>
          <span className="block font-mono text-[9.5px] tracking-[0.13em] text-accent">
            YOUR NEXT STEP
          </span>
          <b className="text-[15px]">Join a community group</b>
        </div>
        <span className="ml-auto rounded-full bg-accent px-4 py-2 text-[12px] font-semibold text-white max-[640px]:ml-0">
          Browse groups →
        </span>
      </div>
    </div>
  );
}

/* ---------- floating annotations ---------- */
const NOTES = [
  {
    side: "left" as const,
    pos: "top-[36%] left-0 -translate-x-[90%]",
    label: "YOU DEFINE THIS",
    text: "The pathway is yours — we just put it in front of people.",
    delay: 600,
  },
  {
    side: "right" as const,
    pos: "top-[22%] right-0 translate-x-[75%]",
    label: "LIVE DATA",
    text: "Her group and giving, straight from your church software.",
    delay: 1200,
  },
  {
    side: "right" as const,
    pos: "bottom-[16%] right-0 translate-x-[75%]",
    label: "THE PAYOFF",
    text: "One clear next step, every single visit.",
    delay: 1800,
  },
];

/* ---------- section ---------- */
export default function Discipleship() {
  const ds = DATA.discipleship;
  const [ref, inView] = useInView();
  const { phase, setIdx, cycle } = usePhase(inView);
  const [prog, setProg] = useState(0);

  useEffect(() => {
    if (phase !== "personal") {
      setProg(0);
      return;
    }
    let p = 0;
    const t = setInterval(() => {
      p += 1;
      setProg(p);
      if (p >= 3) clearInterval(t);
    }, 520);
    return () => clearInterval(t);
  }, [phase, cycle]);

  const tab = (active: boolean) =>
    `cursor-pointer rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-300 ${
      active ? "bg-paper text-ink" : "text-dark-muted hover:text-dark-ink"
    }`;

  return (
    <section
      id="discipleship"
      ref={ref}
      className="relative scroll-mt-[88px] overflow-hidden bg-dark-bg py-[130px] max-[720px]:py-[84px]"
    >
      {/* top seam + glow + watermark */}
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--color-accent)_65%,transparent),transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-[46%] h-[620px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-0.16em] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-serif text-[min(19vw,250px)] italic leading-none text-dark-ink/[0.035]">
        to disciple.
      </div>

      <Wrap className="relative">
        <div
          className={`transition-[opacity,translate] duration-700 ${
            inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="mx-auto mb-12 flex max-w-[820px] flex-col items-center gap-[22px] text-center">
            <Eyebrow className="justify-center">{ds.eyebrow}</Eyebrow>
            <h2 className="font-serif text-[clamp(34px,4.6vw,58px)] leading-[1.06] tracking-[-0.025em] text-dark-ink [font-weight:460]">
              {ds.titleA}{" "}
              <em className="text-[color-mix(in_oklab,var(--color-accent)_72%,#f4f0e8)]">
                {ds.titleB}
              </em>
            </h2>
            <p className="max-w-[36em] text-[clamp(16px,1.6vw,18px)] leading-[1.6] text-dark-muted">
              {ds.sub}
            </p>
          </div>

          {/* before / after control */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex rounded-full border border-dark-line bg-white/[0.04] p-1">
              <button className={tab(phase !== "personal")} onClick={() => setIdx(0)}>
                {ds.tabs.before}
              </button>
              <button className={tab(phase === "personal")} onClick={() => setIdx(2)}>
                {ds.tabs.after}
              </button>
            </div>
          </div>

          {/* the browser */}
          <div className="relative mx-auto max-w-[940px]">
            <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0f0d0a] shadow-[0_60px_120px_-50px_rgba(0,0,0,0.85)]">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                <TrafficLights />
                <div className="ml-3 rounded-md bg-white/[0.06] px-3 py-1 font-mono text-[11px] text-dark-muted">
                  grace.church{phase === "personal" ? "/members" : ""}
                </div>
                <div className="ml-auto font-mono text-[10px] tracking-[0.1em] text-dark-muted/70">
                  {phase === "personal" ? "SIGNED IN" : "PUBLIC"}
                </div>
              </div>
              <div className="relative bg-paper">
                <Dashboard prog={prog} cycle={cycle} />
                <PublicSite phase={phase} />
                {phase === "signin" && <SignInOverlay />}
              </div>
            </div>

            {/* annotations */}
            {phase === "personal" &&
              NOTES.map((n, i) => (
                <div
                  key={`${cycle}-${i}`}
                  className={`pointer-events-none absolute z-[3] w-[200px] animate-pop rounded-xl border border-dark-line bg-[#201c15] px-4 py-3 shadow-[0_22px_44px_-20px_rgba(0,0,0,0.8)] max-[1199px]:hidden ${n.pos}`}
                  style={{ animationDelay: n.delay + "ms", animationFillMode: "backwards" }}
                >
                  <span className="mb-1 flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.13em] text-accent">
                    <span className="h-[5px] w-[5px] rounded-full bg-accent" />
                    {n.label}
                  </span>
                  <span className="text-[12.5px] leading-[1.45] text-dark-ink/90">
                    {n.text}
                  </span>
                </div>
              ))}
          </div>

          {/* how it works */}
          <div className="mx-auto mt-20 grid max-w-[1080px] grid-cols-3 gap-9 max-[820px]:grid-cols-1 max-[820px]:gap-7">
            {ds.beats.map((b) => (
              <div key={b.n} className="border-t border-dark-line pt-6">
                <span className="font-mono text-[12px] font-semibold tracking-[0.1em] text-accent">
                  {b.n}
                </span>
                <h3 className="mt-2.5 font-serif text-[21px] leading-[1.2] tracking-[-0.01em] text-dark-ink [font-weight:460]">
                  {b.k}
                </h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-dark-muted">
                  {b.v}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-3.5">
              <Btn href={DATA.demoUrl} target="_blank" rel="noreferrer">
                {ds.cta} <Arrow />
              </Btn>
              <Btn variant="ghostLight" href="/book">
                {ds.secondary}
              </Btn>
            </div>
            <span className="font-mono text-[11.5px] tracking-[0.04em] text-dark-muted">
              {ds.ctaNote}
            </span>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
