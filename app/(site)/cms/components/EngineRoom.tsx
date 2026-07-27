import type { ReactNode } from "react";
import { Glow, SectionHead } from "@/app/(site)/components/ui";
import FeatureRail from "@/app/(site)/components/FeatureRail";
import { Wrap } from "@/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-paper/10 bg-[#1f1a14] px-7 py-6 shadow-[0_40px_110px_-40px_rgba(187,74,35,0.35)] max-[720px]:px-5">
      {children}
    </div>
  );
}

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

export default function EngineRoom() {
  const panels = [
    /* 01 — live congregation dashboard */
    <Panel key="journey">
      <div className="flex items-center justify-between">
        <b className="font-serif text-lg">Your congregation</b>
        <span className="inline-flex items-center gap-[7px] font-mono text-[10px] tracking-[0.1em] text-accent-soft">
          <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
          LIVE
        </span>
      </div>
      <div className="mt-[18px] flex flex-col gap-[11px]">
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
      <div className="mt-[18px] flex animate-[cyc_8s_0.6s_infinite_both] items-center justify-between gap-2.5 rounded-xl border border-paper/[0.09] bg-[#262019] px-[15px] py-3">
        <span className="inline-flex items-center gap-[9px]">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#3a332a] text-[10px] font-bold">
            M
          </span>
          <span className="text-[13px]">
            <b>Marcus Lee</b> · stuck at {"“"}Membership{"”"} for 6 weeks
          </span>
        </span>
        <span className="whitespace-nowrap text-xs font-semibold text-accent-soft">
          Follow up {"→"}
        </span>
      </div>
    </Panel>,

    /* 02 — segmented messaging */
    <Panel key="message">
      <div className="font-mono text-[10px] tracking-[0.12em] text-paper/50">
        TO
      </div>
      <div className="mt-[9px] flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-[7px] rounded-full bg-paper/[0.14] px-[13px] py-[7px] text-[12.5px] font-semibold">
          Not in a group <span className="opacity-55">{"✕"}</span>
        </span>
        <span className="inline-flex items-center gap-[7px] rounded-full bg-paper/[0.14] px-[13px] py-[7px] text-[12.5px] font-semibold">
          Cambridge campus <span className="opacity-55">{"✕"}</span>
        </span>
        <span className="inline-flex items-center gap-[7px] rounded-full border border-dashed border-paper/25 px-[13px] py-[7px] text-[12.5px] font-semibold text-paper/55">
          + Add filter
        </span>
      </div>
      <div className="mt-3 flex items-center gap-[9px] text-[13.5px] font-semibold text-accent-soft">
        <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
        72 members match
      </div>
      <div className="mt-4 animate-[cyc_8s_0.5s_infinite_both] rounded-2xl border border-paper/[0.12] bg-[#2a241d] px-4 py-3.5">
        <div className="flex items-center gap-[9px]">
          <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-accent text-xs text-white">
            {"✝"}
          </span>
          <span className="text-[11.5px] font-semibold text-paper/80">
            GRACE FELLOWSHIP
          </span>
          <span className="ml-auto text-[11px] text-paper/50">now</span>
        </div>
        <b className="mt-[9px] block text-[14.5px]">
          Group Launch Night — Thursday
        </b>
        <span className="mt-0.5 block text-[13px] text-paper/65">
          Find your group before they fill up.
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="inline-flex gap-1.5">
          <span className="rounded-full bg-accent/[0.16] px-[11px] py-[5px] font-mono text-[9px] tracking-[0.08em] text-accent-soft">
            PUSH {"✓"}
          </span>
          <span className="rounded-full bg-accent/[0.16] px-[11px] py-[5px] font-mono text-[9px] tracking-[0.08em] text-accent-soft">
            EMAIL {"✓"}
          </span>
        </span>
        <span className="inline-flex rounded-full bg-accent px-[17px] py-2.5 text-[13px] font-semibold text-white">
          Send to 72 {"→"}
        </span>
      </div>
    </Panel>,

    /* 03 — 2-way ChMS sync */
    <Panel key="sync">
      <div className="grid grid-cols-[1fr_56px_1fr] items-center max-[720px]:grid-cols-1 max-[720px]:gap-3">
        <div className="rounded-[14px] border border-paper/[0.12] px-4 py-[15px]">
          <div className="font-mono text-[9px] tracking-[0.1em] text-paper/50">
            YOUR ChMS
          </div>
          <div className="mt-[11px] flex flex-col gap-2 text-[13px] font-semibold">
            {["People · 542", "Groups · 24", "Events · 11"].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="relative h-20 max-[720px]:h-10 max-[720px]:rotate-90">
          <div className="absolute inset-x-[-6px] top-[26px] h-0.5 animate-[flow_0.9s_linear_infinite] bg-[repeating-linear-gradient(90deg,rgba(187,74,35,0.75)_0_9px,transparent_9px_16px)]" />
          <div className="absolute inset-x-[-6px] bottom-[26px] h-0.5 animate-[flow_0.9s_linear_infinite_reverse] bg-[repeating-linear-gradient(90deg,rgba(187,74,35,0.75)_0_9px,transparent_9px_16px)]" />
        </div>
        <div className="rounded-[14px] border-[1.5px] border-accent/45 bg-accent/[0.06] px-4 py-[15px]">
          <div className="font-mono text-[9px] tracking-[0.1em] text-accent-soft">
            SITE &amp; APP
          </div>
          <div className="mt-[11px] flex flex-col gap-2 text-[13px] font-semibold">
            <span>{"✓"} People synced</span>
            <span className="flex items-center gap-2">
              {"✓"} Groups synced{" "}
              <em className="animate-[cyc_8s_0.8s_infinite_both] rounded-full bg-accent px-[7px] py-0.5 text-[9px] font-bold not-italic text-white">
                +1
              </em>
            </span>
            <span>{"✓"} Events synced</span>
          </div>
        </div>
      </div>
      <div className="mt-[18px] flex animate-[cyc_8s_0.4s_infinite_both] items-center gap-2.5 rounded-xl border border-paper/[0.09] bg-[#262019] px-[15px] py-3">
        <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
        <span className="text-[13px] text-paper/70">
          <b className="text-paper">
            {"“"}Families North{"”"} added in Planning Center
          </b>{" "}
          — live on your site &amp; app 30 seconds later.
        </span>
      </div>
    </Panel>,
  ];

  return (
    <section id="sync" className="relative scroll-mt-[88px] pt-[130px] max-[920px]:pt-20">
      <Glow className="left-1/2 top-[-120px] h-[560px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),rgba(187,74,35,0.05)_55%,transparent_78%)]" />
      <Wrap>
        <SectionReveal>
          <SectionHead
            animate
            kicker="02 // The engine room"
            title={"Where your staff\nruns the engine."}
          />
        </SectionReveal>
        <FeatureRail
          reveal
          items={[
            {
              title: "See every member’s journey",
              desc: "The whole congregation on one live dashboard — every step, every person.",
            },
            {
              title: "Message exactly the right people",
              desc: "Pick a segment, write once, and send — push, email, or both.",
            },
            {
              title: "2-way sync with your ChMS",
              desc: "Events, groups, and people stay up to date — no manual entry, ever.",
            },
          ]}
          panels={panels}
        />
      </Wrap>
    </section>
  );
}
