"use client";

import { useEffect, useRef, useState } from "react";
import type { ChapterData, DemoLink } from "@/app/v2/data";
import { V2 } from "@/app/v2/data";
import { useChurchName } from "@/app/v2/church-name";
import { ChapterCta, Kicker, Squiggle } from "@/app/v2/components/ui";

/* Chapter five — the dark section with the animated browser demo:
   public site → sign-in → personalized member dashboard, on a loop
   once scrolled into view. The tabs let the visitor drive it manually. */

const SEQ = [
  { name: "public", ms: 3400 },
  { name: "signin", ms: 1900 },
  { name: "personal", ms: 9200 },
] as const;
type Phase = (typeof SEQ)[number]["name"];

const PATH = [
  "Attend a Sunday gathering",
  "Get baptized",
  "Join a community group",
  "Take the membership class",
  "Find a place to serve",
];

const NOTES = [
  {
    style: { top: "32%", left: "-180px" },
    label: "their pathway",
    text: "They defined the steps — we surfaced them.",
    delay: 600,
  },
  {
    style: { top: "10%", right: "-180px" },
    label: "live data",
    text: "Her group and classes, straight from their church software.",
    delay: 1200,
  },
  {
    style: { bottom: "6%", right: "-180px" },
    label: "the payoff",
    text: "One clear next step, every single visit.",
    delay: 1800,
  },
];

const mLabel =
  "block font-mono text-[9.5px] tracking-[0.13em] text-nb-red";
const mLine = "rounded-[3px] bg-ink/18";

function VisitorOverlay({ phase, church }: { phase: Phase; church: string }) {
  return (
    <div
      className={`absolute inset-0 z-[1] overflow-hidden transition-opacity duration-700 ${
        phase === "personal" ? "pointer-events-none opacity-0" : ""
      }`}
    >
      <div className="flex items-center gap-2.5 border-b border-ink/12 bg-card px-5 py-[13px]">
        <b className="text-[15px]">{church}</b>
        <span className="ml-2 flex gap-[7px]">
          {[0, 1, 2].map((i) => (
            <i key={i} className="block h-1 w-6 rounded-sm bg-ink/14" />
          ))}
        </span>
        <span
          className={`ml-auto rounded-full bg-ink px-3.5 py-1.5 text-[11px] font-semibold text-paper ${
            phase === "signin"
              ? "bg-nb-red shadow-[0_0_0_4px_rgba(179,64,47,0.3)]"
              : ""
          }`}
        >
          Sign in
        </span>
      </div>
      <div className="flex flex-col gap-[9px] bg-[repeating-linear-gradient(45deg,var(--color-paper-2),var(--color-paper-2)_10px,var(--color-paper-3)_10px,var(--color-paper-3)_20px)] px-5 pb-[26px] pt-[30px]">
        <div className="text-2xl leading-[1.1]">You&rsquo;re welcome here.</div>
        <div className={`h-1.5 w-[52%] ${mLine}`} />
        <div className={`h-1.5 w-[34%] ${mLine}`} />
        <span className="self-start rounded-full bg-ink px-3.5 py-1.5 text-[11px] font-semibold text-paper">
          Plan your visit
        </span>
      </div>
      <div className="px-5 pb-3.5 pt-[18px]">
        <span className={`mb-2.5 ${mLabel}`}>THIS SUNDAY</span>
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-1.5 rounded-lg border border-ink/12 bg-card p-[9px]"
            >
              <div className="h-11 rounded-[5px] bg-paper-3" />
              <div className={`h-1 w-[72%] ${mLine}`} />
              <div className={`h-1 w-[46%] ${mLine}`} />
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 pb-[18px] font-mono text-[11px] text-muted">
        The same page, for everyone, every visit.
      </div>
    </div>
  );
}

function SignInOverlay({ church }: { church: string }) {
  return (
    <div className="absolute inset-0 z-[2] grid place-items-center bg-ink/30">
      <div className="flex w-[250px] animate-nb-pop flex-col gap-2.5 rounded-xl border border-ink/14 bg-card px-[22px] py-6 text-center shadow-[0_30px_56px_-24px_rgba(28,24,19,0.55)]">
        <div className="text-[22px] font-semibold text-[#b3a39c]">{church}</div>
        <div className="text-[11.5px] text-muted">Member sign in</div>
        <div className="flex items-center rounded-lg border border-ink/14 bg-paper-2 px-[11px] py-[9px] text-left font-mono text-[11.5px] text-ink-soft">
          sarah@email.com
          <i className="ml-0.5 inline-block h-3 w-[1.5px] animate-blink bg-nb-red" />
        </div>
        <div className="flex items-center rounded-lg border border-ink/14 bg-paper-2 px-[11px] py-[9px] text-left font-mono text-[11.5px] text-muted">
          ••••••••
        </div>
        <div className="rounded-lg bg-nb-red py-[9px] text-[12.5px] font-semibold text-white">
          Sign in
        </div>
      </div>
    </div>
  );
}

function MemberDash({ prog, church }: { prog: number; church: string }) {
  const st = (i: number): "done" | "now" | "next" =>
    i < 2 && prog > i ? "done" : i === 2 && prog >= 3 ? "now" : "next";
  const d = (ms: number) => ({ animationDelay: `${ms}ms` });
  const fill = [10, 30, 50, 50][Math.min(prog, 3)];
  return (
    <div className="animate-nb-fade bg-paper text-left text-ink">
      <div className="flex flex-col gap-3.5 px-5 pb-5 pt-[18px]">
        <div className="flex animate-fade-in-back items-center gap-2.5 border-b border-ink/12 pb-[11px]">
          <b className="text-[15px]">{church}</b>
          <span className="ml-2 flex gap-[7px]">
            {[0, 1, 2].map((i) => (
              <i key={i} className="block h-1 w-6 rounded-sm bg-ink/14" />
            ))}
          </span>
          <span className="ml-auto inline-flex items-center gap-[7px] rounded-full bg-paper-2 px-[11px] py-[5px] font-mono text-[9.5px] tracking-[0.06em] text-ink-soft">
            <i className="h-[7px] w-[7px] animate-nb-pulse rounded-full bg-nb-red" />
            SYNCED · YOUR ChMS
          </span>
          <span className="flex items-center gap-[7px] text-[13px] font-medium">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-nb-red text-[11px] font-semibold text-white">
              S
            </span>
            Sarah
          </span>
        </div>
        <div className="animate-fade-in-back text-[22px]" style={d(120)}>
          Welcome back, <b className="text-nb-red">Sarah.</b>
        </div>
        <div className="grid grid-cols-[1.3fr_0.95fr] gap-3 max-md:grid-cols-1">
          <div
            className="animate-fade-in-back rounded-[10px] border border-ink/12 bg-card p-[13px]"
            style={d(240)}
          >
            <span className={`mb-2.5 ${mLabel}`}>YOUR PATHWAY</span>
            <div className="relative">
              <div className="absolute bottom-[19px] left-[9px] top-[19px] w-[2px] rounded-sm bg-ink/7" />
              <div
                className="absolute left-[9px] top-[19px] w-[2px] rounded-sm bg-nb-red transition-[height] duration-500 ease-out"
                style={{ height: `calc((100% - 38px) * ${fill} / 100)` }}
              />
              <div className="flex flex-col">
                {PATH.map((t, i) => {
                  const s = st(i);
                  return (
                    <div
                      key={i}
                      className={`relative flex items-center gap-2.5 whitespace-nowrap py-[7px] text-[13px] transition-colors duration-300 ${
                        s === "done"
                          ? "text-muted"
                          : s === "now"
                            ? "font-semibold"
                            : ""
                      }`}
                    >
                      <span
                        className={`relative z-[1] grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] transition-[background,box-shadow] duration-300 ${
                          s === "done"
                            ? "bg-[#3a6a4e] text-white"
                            : s === "now"
                              ? "animate-nb-pulse bg-nb-red text-white"
                              : "bg-card shadow-[inset_0_0_0_2px_rgba(28,24,19,0.18)]"
                        }`}
                      >
                        {s === "done" && <span className="animate-nb-pop">✓</span>}
                        {s === "now" && <span className="animate-nb-pop">→</span>}
                      </span>
                      <span
                        className={`overflow-hidden text-ellipsis ${s === "done" ? "line-through" : ""}`}
                      >
                        {t}
                      </span>
                      {s === "now" && (
                        <span className="ml-auto animate-nb-pop font-mono text-[8.5px] text-nb-red">
                          {"YOU'RE HERE"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div
              className="animate-fade-in-back rounded-[10px] border border-ink/12 bg-card p-[13px]"
              style={d(360)}
            >
              <span className={`mb-2.5 ${mLabel}`}>YOUR GROUP</span>
              <div className="text-[13.5px] font-semibold">
                Tuesday Women&rsquo;s Group
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted">
                Next: Tue 7:00pm · Hosted by Beth
              </div>
              <div className="mt-[9px] flex">
                {["B", "S", "M"].map((c, i) => (
                  <span
                    key={i}
                    className={`grid h-[22px] w-[22px] place-items-center rounded-full bg-ink text-[9px] font-semibold text-paper shadow-[0_0_0_2px_var(--color-card)] ${
                      i ? "-ml-1.5" : ""
                    }`}
                  >
                    {c}
                  </span>
                ))}
                <span className="-ml-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-paper-3 text-[9px] font-semibold text-ink-soft shadow-[0_0_0_2px_var(--color-card)]">
                  +5
                </span>
              </div>
            </div>
            <div
              className="animate-fade-in-back rounded-[10px] border border-nb-red/22 bg-nb-red/8 p-[13px]"
              style={d(480)}
            >
              <span className={`mb-2.5 ${mLabel}`}>YOUR CLASSES</span>
              <div className="text-[13.5px] font-semibold">
                Growth Track — complete
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted">
                Finished spring 2025
              </div>
            </div>
          </div>
        </div>
        <div
          className="flex animate-fade-in-back items-center gap-2.5 rounded-[10px] border border-nb-red/30 bg-nb-red/8 px-[13px] py-[11px]"
          style={d(640)}
        >
          <div>
            <span className={`mb-0.5 ${mLabel}`}>YOUR NEXT STEP</span>
            <b className="text-[13.5px]">Join a community group</b>
          </div>
          <span className="ml-auto whitespace-nowrap rounded-full bg-nb-red px-[13px] py-[7px] text-[11px] font-semibold text-white">
            Browse groups →
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ChapterDisciple({
  ch,
  cta,
}: {
  ch: ChapterData;
  cta: DemoLink;
}) {
  const d = V2.discipleship;
  const { name } = useChurchName();
  const church = name.trim() || "Yourchurch";
  const slug =
    (name.trim()
      ? name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
      : "yourchurch") + ".org";

  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const [idx, setIdx] = useState(0);
  const [manual, setManual] = useState(false);
  const [cycle, setCycle] = useState(0);
  const phase = SEQ[idx].name;
  useEffect(() => {
    if (!inView || manual) return;
    const t = setTimeout(() => setIdx((v) => (v + 1) % SEQ.length), SEQ[idx].ms);
    return () => clearTimeout(t);
  }, [inView, manual, idx]);
  useEffect(() => {
    if (phase === "personal") setCycle((c) => c + 1);
  }, [phase]);

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

  const pick = (i: number) => {
    setManual(true);
    setIdx(i);
  };

  return (
    <section
      ref={ref}
      id="chapter-5"
      className="mt-[104px] bg-nb-ink pb-24 pt-11 text-nb-paper"
    >
      <Squiggle v={4} dark />
      <div className="text-center">
        <Kicker gold>chapter five</Kicker>
      </div>
      <h2 className="mb-[26px] mt-1 text-balance px-5 text-center text-4xl font-semibold leading-[1.25] text-nb-paper max-md:text-[32px]">
        {ch.title}
      </h2>
      <div className="mx-auto max-w-[620px] px-10 max-md:px-6">
        {ch.paras.map((p, i) => (
          <p key={i} className="mb-5 text-pretty text-lg text-nb-dark-body">
            {p}
          </p>
        ))}
      </div>
      <div className="mb-7 mt-10 flex justify-center">
        <div className="inline-flex gap-1 rounded-full border-2 border-nb-paper/35 p-1">
          <button
            className={`cursor-pointer rounded-full px-[22px] py-[9px] font-nb-serif text-[15px] transition-colors duration-200 ${
              phase !== "personal"
                ? "bg-nb-paper font-semibold text-nb-ink"
                : "text-nb-dark-muted"
            }`}
            onClick={() => pick(0)}
          >
            {d.tabs.before}
          </button>
          <button
            className={`cursor-pointer rounded-full px-[22px] py-[9px] font-nb-serif text-[15px] transition-colors duration-200 ${
              phase === "personal"
                ? "bg-nb-paper font-semibold text-nb-ink"
                : "text-nb-dark-muted"
            }`}
            onClick={() => pick(2)}
          >
            {d.tabs.after}
          </button>
        </div>
      </div>
      <div className="relative mx-auto max-w-[860px] max-lg:mx-5">
        <div className="overflow-hidden rounded-[10px] border border-nb-paper/22 shadow-[0_46px_90px_-42px_rgba(0,0,0,0.75)]">
          <div className="flex items-center gap-1.5 border-b border-nb-paper/12 bg-[#2c2720] px-3.5 py-[11px]">
            {[0, 1, 2].map((i) => (
              <i key={i} className="h-[9px] w-[9px] rounded-full bg-nb-paper/22" />
            ))}
            <span className="ml-2.5 rounded-[5px] bg-nb-paper/8 px-2.5 py-[3px] font-mono text-[12.5px] text-nb-dark-muted">
              {slug}
              {phase === "personal" ? "/members" : ""}
            </span>
            <span className="ml-auto font-mono text-[11px] tracking-[0.1em] text-nb-faded">
              {phase === "personal" ? "SIGNED IN" : "PUBLIC"}
            </span>
          </div>
          <div className="relative min-h-[440px] bg-paper">
            <MemberDash key={cycle} prog={prog} church={church} />
            <VisitorOverlay phase={phase} church={church} />
            {phase === "signin" && <SignInOverlay church={church} />}
          </div>
        </div>
        {phase === "personal" &&
          NOTES.map((n, i) => (
            <div
              key={`${cycle}-${i}`}
              className={`absolute z-[3] w-[190px] animate-nb-pop-back border border-nb-receipt-line bg-nb-receipt px-3.5 pb-[13px] pt-3 shadow-[4px_5px_0_rgba(0,0,0,0.3)] max-[1400px]:hidden ${
                i % 2 === 1 ? "rotate-[1.5deg]" : "-rotate-2"
              }`}
              style={{ ...n.style, animationDelay: `${n.delay}ms` }}
            >
              <span className="mb-[3px] block font-nb-hand text-[22px] leading-[1.1] text-nb-red">
                {n.label}
              </span>
              <p className="text-[13px] leading-[1.5] text-nb-ink">{n.text}</p>
            </div>
          ))}
      </div>
      <div className="mx-auto mt-[58px] grid max-w-[920px] grid-cols-3 gap-[34px] px-12 max-md:grid-cols-1 max-md:px-6">
        {d.beats.map((b, i) => (
          <div key={i} className="border-t-2 border-dashed border-nb-gold/40 pt-4">
            <span className="font-nb-hand text-[26px] text-nb-gold">{b.n}.</span>
            <h3 className="mb-2 mt-1.5 text-[18.5px] font-semibold leading-[1.3] text-nb-paper">
              {b.k}
            </h3>
            <p className="text-sm leading-[1.6] text-nb-dark-muted">{b.v}</p>
          </div>
        ))}
      </div>
      <ChapterCta dark note={cta.note} label={cta.label} href={cta.href} />
    </section>
  );
}
