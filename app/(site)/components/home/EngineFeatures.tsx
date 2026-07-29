import type { ReactNode } from "react";
import { Glow, SectionHead } from "@/app/(site)/components/ui";
import ScrollFeatureRail from "@/app/(site)/components/ScrollFeatureRail";
import TargetedMessagePanel from "@/app/(site)/components/TargetedMessagePanel";
import { Wrap } from "@/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";

function Panel({
  children,
  padded = true,
}: {
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[20px] border border-paper/10 bg-[#1f1a14] text-paper shadow-[0_40px_110px_-40px_rgba(187,74,35,0.35)] ${
        padded ? "px-7 py-6 max-[720px]:px-5" : ""
      }`}
    >
      {children}
    </div>
  );
}

function Cursor({ className = "" }: { className?: string }) {
  return (
    <span className={`pointer-events-none absolute z-[5] ${className}`}>
      <svg width="19" height="19" viewBox="0 0 24 24">
        <path
          d="M5 3l14 9-6 1.2-3.4 5.8L5 3z"
          fill="#f4f0e8"
          stroke="#1f1a14"
          strokeWidth="1.4"
        />
      </svg>
    </span>
  );
}

/* Choreography keyframes for the animated panels (14s loops) */
const KEYFRAMES = `
@keyframes softpulse{0%,100%{opacity:1}50%{opacity:.4}}
/* backend panel: email types, cursor confirms it, then picks "Yes" */
@keyframes bkcur{
  0%,26%{opacity:0;transform:translate(52px,-152px)}
  30%{opacity:1;transform:translate(52px,-152px)}
  32%{transform:translate(52px,-152px) scale(.8)}
  34%{transform:translate(52px,-152px) scale(1)}
  44%{transform:translate(-346px,-39px)}
  47%{transform:translate(-346px,-39px) scale(.8)}
  50%{transform:translate(-346px,-39px) scale(1)}
  60%{transform:translate(0,0)}
  63%{transform:translate(0,0) scale(.8)}
  66%{transform:translate(0,0) scale(1)}
  72%{opacity:1;transform:translate(0,0)}
  78%,100%{opacity:0;transform:translate(0,0)}
}
@keyframes bkpop{0%,32%{opacity:0;transform:scale(.4)}36%{opacity:1;transform:scale(1.2)}39%,94%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.4)}}
@keyframes bkyes{
  0%,47%{background:rgba(244,240,232,0);color:rgba(244,240,232,0.65);box-shadow:inset 0 0 0 1.5px rgba(244,240,232,0.2)}
  50%,93%{background:#bb4a23;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(187,74,35,0)}
  98%,100%{background:rgba(244,240,232,0);color:rgba(244,240,232,0.65);box-shadow:inset 0 0 0 1.5px rgba(244,240,232,0.2)}
}
@keyframes bkbar{0%,52%{transform:scaleX(0)}62%,93%{transform:scaleX(1)}100%{transform:scaleX(0)}}
@keyframes bknext{
  0%,49%{background:rgba(244,240,232,0.08);color:rgba(244,240,232,0.45)}
  52%,61%{background:#bb4a23;color:#fff}
  63%{background:#8a3418;color:#fff}
  65%,93%{background:#bb4a23;color:#fff}
  98%,100%{background:rgba(244,240,232,0.08);color:rgba(244,240,232,0.45)}
}
`;

const JOURNEY_BARS = [
  { label: "Newcomer", width: "w-full", opacity: "", delay: "0.1s", n: "212" },
  {
    label: "Baptized",
    width: "w-[71%]",
    opacity: "opacity-75",
    delay: "0.3s",
    n: "150",
  },
  {
    label: "In a Group",
    width: "w-[49%]",
    opacity: "opacity-55",
    delay: "0.5s",
    n: "104",
  },
  {
    label: "Serving",
    width: "w-[29%]",
    opacity: "opacity-40",
    delay: "0.7s",
    n: "62",
  },
];

export default function EngineFeatures() {
  const panels = [
    /* 01 — a personal next step */
    <Panel key="personal" padded={false}>
      <div className="flex items-center justify-between border-b border-paper/10 px-6 py-[13px]">
        <b className="font-serif text-base">Grace Fellowship</b>
        <span className="inline-flex items-center gap-2 text-[12.5px] text-paper/65">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#3a332a] text-[10px] font-bold text-paper">
            S
          </span>
          Sarah
        </span>
      </div>
      <div className="px-7 pb-7 pt-6 max-[720px]:px-5">
        <div className="font-serif text-[26px] tracking-[-0.01em]">
          Welcome back, Sarah.
        </div>
        <div className="mt-4 rounded-[15px] border-[1.5px] border-accent/55 bg-accent/[0.13] px-5 py-[17px] shadow-[0_18px_34px_-22px_rgba(187,74,35,0.5)]">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-accent-soft">
            <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
            YOUR NEXT STEP
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <b className="font-serif text-[21px] font-medium">
              Join a Community Group
            </b>
            <span className="flex-none rounded-full bg-accent px-4 py-[9px] text-[12.5px] font-semibold text-white">
              Find a group {"→"}
            </span>
          </div>
        </div>
        <div className="mt-[22px] flex items-center">
          {[0, 1].map((i) => (
            <span key={i} className="contents">
              <span className="grid h-[18px] w-[18px] flex-none place-items-center rounded-full bg-accent text-[10px] text-white">
                {"✓"}
              </span>
              <span className="h-0.5 flex-1 bg-accent" />
            </span>
          ))}
          <span className="h-4 w-4 flex-none animate-pulse-dot rounded-full border-2 border-accent" />
          <span className="h-0.5 flex-1 bg-paper/[0.13]" />
          <span className="h-4 w-4 flex-none rounded-full border-2 border-paper/20" />
        </div>
        <div className="mt-[7px] flex justify-between font-mono text-[9px] tracking-[0.06em]">
          <span className="text-paper/65">BAPTISM</span>
          <span className="text-paper/65">MEMBERSHIP</span>
          <span className="text-accent-soft [animation:softpulse_2.4s_ease-in-out_infinite]">
            GROUP
          </span>
          <span className="text-paper/50">SERVE</span>
        </div>
      </div>
    </Panel>,

    /* 02 — live congregation dashboard */
    <Panel key="dashboard">
      <div className="flex items-center justify-between">
        <b className="font-serif text-lg">Your congregation</b>
        <span className="inline-flex items-center gap-[7px] font-mono text-[10px] tracking-[0.1em] text-accent-soft">
          <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
          LIVE
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-paper/10 px-4 py-3.5">
          <div className="font-serif text-[30px] leading-none">542</div>
          <div className="mt-1 font-mono text-[9px] tracking-[0.1em] text-paper/50">
            MEMBERS
          </div>
        </div>
        <div className="rounded-xl border border-paper/10 px-4 py-3.5">
          <div className="font-serif text-[30px] leading-none text-accent-soft">
            38
          </div>
          <div className="mt-1 font-mono text-[9px] tracking-[0.1em] text-paper/50">
            STEPS THIS MONTH
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-[11px]">
        {JOURNEY_BARS.map((b) => (
          <div
            key={b.label}
            className="grid grid-cols-[100px_1fr_40px] items-center gap-3 max-[720px]:grid-cols-[84px_1fr_36px]"
          >
            <span className="text-[13.5px] font-semibold">{b.label}</span>
            <span className="h-[22px] overflow-hidden rounded-[7px] bg-paper/[0.07]">
              <span
                className={`block h-full ${b.width} ${b.opacity} origin-left rounded-[7px] bg-accent animate-[barcyc_8s_cubic-bezier(0.2,0.8,0.2,1)_infinite_both]`}
                style={{ animationDelay: b.delay }}
              />
            </span>
            <span className="font-mono text-[11px] text-paper/60">{b.n}</span>
          </div>
        ))}
      </div>
    </Panel>,

    /* 03 — targeted reach: pick two segments, watch the match count, send */
    <Panel key="reach">
      <TargetedMessagePanel />
    </Panel>,

    /* 04 — self-filling backend: email types in, then "Yes" gets picked */
    <Panel key="backend">
      <div className="relative">
        <div className="flex items-center justify-between">
          <b className="font-serif text-lg">Complete your profile</b>
          <span className="font-mono text-[10px] tracking-[0.1em] text-paper/50">
            4 OF 5
          </span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1 flex-1 rounded-full bg-accent" />
          ))}
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-paper/15">
            <span className="block h-full w-full origin-left bg-accent [animation:bkbar_14s_infinite_both]" />
          </span>
          <span className="h-1 flex-1 rounded-full bg-paper/15" />
        </div>
        <div className="mt-[18px] flex flex-col gap-2">
          <div className="flex items-center gap-[11px] rounded-[10px] border border-paper/[0.09] bg-[#262019] px-3 py-[9px]">
            <span className="relative grid h-[30px] w-[30px] place-items-center rounded-full bg-[#3a332a] text-[11px] font-bold">
              S
              <span className="absolute -bottom-[3px] -right-[3px] grid h-[13px] w-[13px] place-items-center rounded-full bg-accent text-[8px] text-white">
                {"✓"}
              </span>
            </span>
            <span className="text-[13.5px] font-semibold">Profile photo</span>
            <span className="ml-auto font-mono text-[9px] tracking-[0.08em] text-accent-soft">
              ADDED
            </span>
          </div>
          <div className="flex items-center gap-[11px] rounded-[10px] border border-paper/[0.09] bg-[#262019] px-3 py-[11px]">
            <span className="font-mono text-[9px] tracking-[0.08em] text-paper/50">
              NAME
            </span>
            <span className="text-[13.5px] font-semibold">Sarah Mitchell</span>
            <span className="ml-auto text-xs font-bold text-accent-soft">
              {"✓"}
            </span>
          </div>
          <div className="flex items-center gap-[11px] rounded-[10px] border border-paper/[0.09] bg-[#262019] px-3 py-[11px]">
            <span className="font-mono text-[9px] tracking-[0.08em] text-paper/50">
              EMAIL
            </span>
            <span className="font-mono text-[13px] font-semibold">
              <span className="inline-block animate-[typeE_14s_infinite_both] overflow-hidden whitespace-nowrap align-bottom">
                sarah.m@gmail.com
              </span>
              <span className="inline-block h-[13px] w-[2px] animate-blink bg-accent align-bottom" />
            </span>
            <span className="ml-auto text-xs font-bold text-accent-soft [animation:bkpop_14s_infinite_both]">
              {"✓"}
            </span>
          </div>
        </div>
        <div className="mt-[18px] font-serif text-xl tracking-[-0.01em]">
          Have you been baptized?
        </div>
        <div className="relative">
          <div className="mt-3 flex gap-2.5">
            <span className="grid flex-1 place-items-center rounded-xl p-3 text-[14.5px] font-semibold [animation:bkyes_14s_infinite_both]">
              Yes
            </span>
            <span className="grid flex-1 place-items-center rounded-xl p-3 text-[14.5px] font-semibold text-paper/65 shadow-[inset_0_0_0_1.5px_rgba(244,240,232,0.2)]">
              Not yet
            </span>
          </div>
          <div className="mt-4 flex justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full px-[17px] py-2.5 text-[13px] font-semibold [animation:bknext_14s_infinite_both]">
              Next {"→"}
            </span>
          </div>
          <Cursor className="bottom-[14px] right-[44px] [animation:bkcur_14s_infinite_both]" />
        </div>
      </div>
    </Panel>,
  ];

  return (
    <section className="relative pt-[130px] max-[920px]:pt-20">
      <style>{KEYFRAMES}</style>
      <Glow className="left-1/2 top-[-120px] h-[560px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),rgba(187,74,35,0.05)_55%,transparent_78%)]" />
      <Wrap>
        <SectionReveal>
          <SectionHead
            animate
            kicker="02 // What the engine does"
            title={"Four things your system\nhas never done for you."}
          />
        </SectionReveal>
        <ScrollFeatureRail
          items={[
            {
              title: "A personal next step, for every member",
              desc: "One clear next step on your church’s pathway — never a generic homepage.",
            },
            {
              title: "Know exactly where your members are",
              desc: "One live dashboard of the whole congregation — every step, every person.",
            },
            {
              title: "Reach exactly the right people",
              desc: "Segment your people, and tell just the right group about just the right thing, at just the right time.",
            },
            {
              title: "Complete your backend data",
              desc: "Upon sign in, members complete all relevant data, backfilling your ChMS with up to date information.",
            },
          ]}
          panels={panels}
        />
      </Wrap>
    </section>
  );
}
