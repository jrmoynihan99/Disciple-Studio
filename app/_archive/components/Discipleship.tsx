"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DATA } from "@/app/data";
import { Arrow, Btn, Eyebrow, TrafficLights, Wrap } from "@/components/ui";
import { AppPhone, MEMBER_DECK } from "@/app/_archive/components/DeviceDuo";

const STRIPES =
  "bg-[repeating-linear-gradient(45deg,var(--color-paper-2),var(--color-paper-2)_10px,var(--color-paper-3)_10px,var(--color-paper-3)_20px)]";

/* ---------- auto-playing timeline (loops while in view, seekable) ---------- */
function useAutoCycle(durationMs: number) {
  const ref = useRef<HTMLElement>(null);
  const [t, setT] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let playing = false;
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      setT(((ts - startRef.current) % durationMs) / durationMs);
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !playing) {
          playing = true;
          raf = requestAnimationFrame(tick);
        } else if (!e.isIntersecting && playing) {
          playing = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [durationMs]);

  const seek = useCallback(
    (target: number) => {
      startRef.current = performance.now() - target * durationMs;
      setT(target);
    },
    [durationMs],
  );

  return [ref, t, seek] as const;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

/* ---------- floating annotation ---------- */
function Popup({
  className,
  label,
  text,
  opacity,
  delay = 0,
}: {
  className: string;
  label: string;
  text: string;
  opacity: number;
  delay?: number;
}) {
  return (
    <div
      className={`pointer-events-none absolute z-[6] w-[188px] rounded-xl border border-dark-line bg-[#201c15] px-3.5 py-3 shadow-[0_22px_44px_-20px_rgba(0,0,0,0.8)] transition-opacity duration-500 max-[1199px]:hidden ${className}`}
      style={{ opacity, transitionDelay: `${delay}ms` }}
    >
      <span className="mb-1 flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.13em] text-accent">
        <span className="h-[5px] w-[5px] rounded-full bg-accent" />
        {label}
      </span>
      <span className="text-[12.5px] leading-[1.45] text-dark-ink/90">
        {text}
      </span>
    </div>
  );
}

/* ---------- the pathway (inside the web dashboard) ---------- */
const PATH = [
  "Attend a Sunday gathering",
  "Get baptized",
  "Join a community group",
  "Take the membership class",
  "Find a place to serve",
];

function Pathway() {
  const state = (i: number): "done" | "now" | "next" =>
    i < 2 ? "done" : i === 2 ? "now" : "next";
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <span className="mb-3 block font-mono text-[9.5px] tracking-[0.13em] text-muted">
        YOUR PATHWAY
      </span>
      <div className="relative">
        <div className="absolute bottom-[19px] left-[9px] top-[19px] w-[2px] rounded-full bg-line-2" />
        <div
          className="absolute left-[9px] top-[19px] w-[2px] rounded-full bg-accent"
          style={{ height: "calc((100% - 38px) * 0.5)" }}
        />
        <div className="flex flex-col">
          {PATH.map((t, i) => {
            const s = state(i);
            return (
              <div
                key={i}
                className={`relative flex items-center gap-2.5 rounded-[9px] px-0 py-[7px] text-[13px] ${
                  s === "done" ? "text-muted" : ""
                }`}
              >
                <span
                  className={`relative z-[1] grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] ${
                    s === "done"
                      ? "bg-[#3a6a4e] text-white"
                      : s === "now"
                        ? "animate-pulse-dot bg-accent text-white"
                        : "bg-card shadow-[inset_0_0_0_2px_var(--color-line)]"
                  }`}
                >
                  {s === "done" && <span>✓</span>}
                  {s === "now" && <span>→</span>}
                </span>
                <span
                  className={`flex-1 ${s === "done" ? "line-through" : ""} ${
                    s === "now" ? "font-semibold" : ""
                  }`}
                >
                  {t}
                </span>
                {s === "now" && (
                  <span className="font-mono text-[9px] text-accent">
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

/* ---------- web member dashboard (revealed after sign-in) ---------- */
function Dashboard() {
  const label =
    "mb-2.5 block font-mono text-[9.5px] tracking-[0.13em] text-muted";
  return (
    <div className="flex flex-col gap-4 p-5 max-[640px]:p-4">
      <div className="flex items-center gap-3 border-b border-line pb-3">
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
      <div className="text-[24px] tracking-[-0.01em]">
        Welcome back, <b className="font-serif text-accent">Sarah.</b>
      </div>
      <div className="grid grid-cols-[1.3fr_0.95fr] gap-3.5 max-[640px]:grid-cols-1">
        <Pathway />
        <div className="flex flex-col gap-3.5">
          <div className="rounded-xl bg-paper-2 p-4">
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
          <div className="rounded-xl bg-accent-tint p-4 max-[640px]:hidden">
            <span className={label}>THIS YEAR</span>
            <div className="mb-1 font-serif text-[24px] leading-none text-accent">
              $1,240
            </div>
            <div className="text-xs text-muted">in generosity · thank you</div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent-tint px-4 py-3.5 max-[640px]:flex-col max-[640px]:items-start">
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

type WebPhase = "public" | "signin" | "personal";

/* ---------- public site overlay (covers the dashboard until sign-in) ---------- */
function PublicSite({ phase }: { phase: WebPhase }) {
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
      </div>
    </div>
  );
}

function SignInOverlay() {
  return (
    <div className="absolute inset-0 z-[3] grid place-items-center bg-ink/25">
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

/* ---------- section ---------- */
export default function Discipleship() {
  const ds = DATA.discipleship;
  const [ref, t, seek] = useAutoCycle(20000);

  // web: 0 - .5   |   app: .5 - 1
  // public is just a brief glimpse before the sign-in popup pops
  const webPhase: WebPhase =
    t < 0.03 ? "public" : t < 0.12 ? "signin" : "personal";
  const webOut = smooth(0.44, 0.52, t);
  const appIn = smooth(0.5, 0.6, t);
  const appScreen = t < 0.66 ? 0 : t < 0.83 ? 1 : 2;
  const stage = t < 0.5 ? "web" : "app";

  const webShow = webPhase === "personal" ? 1 : 0;
  const pushOp = appIn;
  const nextOp = smooth(0.56, 0.67, t);
  const pocketOp = smooth(0.62, 0.74, t);

  const tab = (active: boolean) =>
    `cursor-pointer rounded-full px-5 py-2 text-[13px] font-medium transition-colors duration-300 ${
      active ? "bg-paper text-ink" : "text-dark-muted hover:text-dark-ink"
    }`;

  return (
    <section
      ref={ref}
      id="discipleship"
      className="relative scroll-mt-[88px] overflow-hidden bg-dark-bg py-[120px] max-[720px]:py-[84px]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--color-accent)_65%,transparent),transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(187,74,35,0.15),transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-0.16em] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-serif text-[min(19vw,250px)] italic leading-none text-dark-ink/[0.035]">
        to disciple.
      </div>

      <Wrap className="relative flex flex-col items-center">
        {/* heading */}
        <div className="mx-auto mb-9 flex max-w-[760px] flex-col items-center gap-3 text-center">
          <Eyebrow className="justify-center">{ds.eyebrow}</Eyebrow>
          <h2 className="font-serif text-[clamp(30px,4.4vw,52px)] leading-[1.07] tracking-[-0.025em] text-dark-ink [font-weight:460]">
            {ds.titleA}{" "}
            <em className="text-[color-mix(in_oklab,var(--color-accent)_72%,#f4f0e8)]">
              {ds.titleB}
            </em>
          </h2>
        </div>

        {/* clickable website / app toggle + auto-filling line */}
        <div className="mb-11 flex flex-col items-center gap-6">
          <div className="inline-flex rounded-full border border-dark-line bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => seek(0)}
              className={tab(stage === "web")}
            >
              Website
            </button>
            <button
              type="button"
              onClick={() => seek(0.5)}
              className={tab(stage === "app")}
            >
              App
            </button>
          </div>
          <div className="h-[3px] w-[200px] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.round(t * 100)}%` }}
            />
          </div>
        </div>

        {/* the stage — web browser and app phone cross-fade in place.
            grid-stacked (both in cell 1/1) so the container grows to the taller
            mockup instead of clipping/overlapping siblings on mobile. */}
        <div className="relative grid w-full grid-cols-1 place-items-center content-center min-h-[clamp(470px,64vh,640px)]">
          {/* WEB */}
          <div
            className="relative w-full max-w-[840px] [grid-area:1/1]"
            style={{
              opacity: 1 - webOut,
              transform: `scale(${1 - 0.06 * webOut}) translateY(${-webOut * 24}px)`,
              pointerEvents: webOut > 0.5 ? "none" : "auto",
            }}
          >
            <div className="mx-auto max-w-[840px] overflow-hidden rounded-[16px] border border-white/10 bg-[#0f0d0a] shadow-[0_60px_120px_-50px_rgba(0,0,0,0.85)]">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                <TrafficLights />
                <div className="ml-3 rounded-md bg-white/[0.06] px-3 py-1 font-mono text-[11px] text-dark-muted">
                  grace.church{webPhase === "personal" ? "/members" : ""}
                </div>
                <div className="ml-auto font-mono text-[10px] tracking-[0.1em] text-dark-muted/70">
                  {webPhase === "personal" ? "SIGNED IN" : "PUBLIC"}
                </div>
              </div>
              <div className="relative bg-paper">
                <Dashboard />
                <PublicSite phase={webPhase} />
                {webPhase === "signin" && <SignInOverlay />}
              </div>
            </div>

            {/* 3 web annotations (during the signed-in dashboard) */}
            <Popup
              className="left-0 top-[28%] -translate-x-[92%]"
              label="YOU DEFINE THIS"
              text="The pathway is yours — we just put it in front of them."
              opacity={webShow}
              delay={0}
            />
            <Popup
              className="right-0 top-[14%] translate-x-[92%]"
              label="LIVE DATA"
              text="Their group and giving, straight from your church software."
              opacity={webShow}
              delay={140}
            />
            <Popup
              className="right-0 bottom-[10%] translate-x-[92%]"
              label="THE PAYOFF"
              text="One clear next step, every single visit."
              opacity={webShow}
              delay={280}
            />
          </div>

          {/* APP */}
          <div
            className="relative flex flex-col items-center [grid-area:1/1]"
            style={{
              opacity: appIn,
              transform: `translateY(${(1 - appIn) * 44}px) scale(${0.94 + 0.06 * appIn})`,
              pointerEvents: appIn < 0.5 ? "none" : "auto",
            }}
          >
            <div className="relative w-[clamp(232px,30vh,286px)]">
              <AppPhone on deck={MEMBER_DECK} fixedIndex={appScreen} />

              {/* 3 app annotations */}
              <Popup
                className="right-0 top-[14%] translate-x-[98%]"
                label="A PUSH NOTIFICATION"
                text="It comes to them — right when it's time."
                opacity={pushOp}
              />
              <Popup
                className="left-0 top-[42%] -translate-x-[98%]"
                label="THEIR NEXT STEP"
                text="Opens straight to the one thing to do next."
                opacity={nextOp}
              />
              <Popup
                className="right-0 bottom-[12%] translate-x-[98%]"
                label="ALWAYS WITH THEM"
                text="Their journey, group, and giving — in their pocket all week."
                opacity={pocketOp}
              />
            </div>
          </div>
        </div>

        {/* caption swaps with the stage */}
        <div className="relative mt-8 min-h-[4.5em] w-full max-w-[42em] text-center text-[clamp(15px,1.6vw,17px)] leading-[1.6] text-dark-muted">
          <span
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: stage === "web" ? 1 : 0 }}
          >
            On the web, they sign in and it knows them — their group, their
            giving, and the one next step on their journey.
          </span>
          <span
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: stage === "app" ? 1 : 0 }}
          >
            In their pocket, the app reaches out with a push — then opens
            straight to that same next step.
          </span>
        </div>

        {/* how it works */}
        <div className="mx-auto mt-12 grid max-w-[1080px] grid-cols-3 gap-9 max-[820px]:grid-cols-1 max-[820px]:gap-7">
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
      </Wrap>
    </section>
  );
}