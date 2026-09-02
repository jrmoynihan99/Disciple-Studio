import { TrafficLights } from "@/components/ui";
import { Glow, SectionHead } from "@/app/(site)/components/ui";
import FeatureRow from "@/app/(site)/components/FeatureRow";
import AccentBand from "@/app/(site)/components/AccentBand";
import SectionReveal from "@/components/reveal-animations/SectionReveal";

const LIVE = "https://www.aletheia.org";

/* Shared shell: floating dark browser/panel window inside a bleed row */
function Window({
  side,
  offset,
  width,
  delay = "",
  children,
}: {
  side: "left" | "right";
  offset: string;
  width: string;
  delay?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-[420px] max-[980px]:h-auto max-[980px]:px-4 max-[980px]:py-6">
      <Glow className="left-1/2 top-1/2 h-[500px] w-[760px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.15),transparent_75%)]" />
      <div
        className={`absolute top-5 ${offset} ${width} overflow-hidden rounded-2xl border border-paper/[0.11] bg-[#1a1611] shadow-[0_60px_120px_-50px_rgba(0,0,0,0.9)] max-[980px]:static max-[980px]:mx-auto max-[980px]:w-full ${
          side === "left" ? "" : ""
        } animate-[bob_7s_ease-in-out_infinite]`}
        style={delay ? { animationDelay: delay } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

/* ——— interactive discipleship track ——— */
function TrackVisual() {
  const steps = [
    {
      done: true,
      label: "Baptism",
      sub: "Start here",
      delay: "0.2s",
    },
    {
      done: true,
      label: "Membership",
      sub: "4-week class",
      delay: "0.5s",
    },
  ];
  return (
    <Window side="left" offset="-left-5" width="w-[640px] max-[980px]:max-w-[640px]">
      <div className="flex items-center gap-1.5 border-b border-paper/[0.09] px-4 py-3 font-mono text-[11px] text-paper/45">
        <TrafficLights small />
        <span className="ml-2">/next-steps</span>
      </div>
      <div className="px-7 pb-[30px] pt-[26px] max-[720px]:px-4">
        <div className="font-serif text-2xl tracking-[-0.01em]">
          The journey at Grace
        </div>
        <div className="mt-[22px] grid grid-cols-4 items-end gap-2.5 max-[720px]:grid-cols-2">
          {steps.map((s) => (
            <div
              key={s.label}
              className="animate-[cyc_9s_infinite_both] rounded-[13px] border border-paper/10 bg-[#1e1913] px-[13px] py-3.5"
              style={{ animationDelay: s.delay }}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] text-white">
                {"✓"}
              </span>
              <b className="mt-[9px] block text-[12.5px]">{s.label}</b>
              <span className="text-[10.5px] text-paper/50">{s.sub}</span>
            </div>
          ))}
          <div className="animate-[cyc_9s_0.8s_infinite_both] rounded-[13px] border-[1.5px] border-accent/60 bg-accent/[0.13] px-[13px] py-[18px] shadow-[0_20px_40px_-20px_rgba(187,74,35,0.5)]">
            <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-accent text-[11px] text-accent-soft">
              3
            </span>
            <b className="mt-[9px] block text-[13px]">Community</b>
            <span className="text-[10.5px] text-accent-soft">
              Click to explore {"→"}
            </span>
          </div>
          <div className="animate-[cyc_9s_1.1s_infinite_both] rounded-[13px] border border-dashed border-paper/[0.18] px-[13px] py-3.5">
            <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-paper/20 text-[11px] text-paper/45">
              4
            </span>
            <b className="mt-[9px] block text-[12.5px] text-paper/60">
              Serving
            </b>
            <span className="text-[10.5px] text-paper/45">Up next</span>
          </div>
        </div>
        <div className="mt-5 flex animate-[cyc_9s_1.5s_infinite_both] items-center gap-[9px] rounded-xl border border-paper/[0.09] bg-[#1e1913] px-[15px] py-3">
          <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
          <span className="text-[13px] text-paper/70">
            <b className="text-paper">Community groups</b> — see what it is, why
            it matters, and jump in at any point.
          </span>
        </div>
      </div>
    </Window>
  );
}

/* ——— full-screen sermon page ——— */
function SermonVisual() {
  return (
    <Window
      side="right"
      offset="-right-5"
      width="w-[660px] max-[980px]:max-w-[660px]"
      delay="0.4s"
    >
      <div className="grid grid-cols-[1.5fr_1fr] bg-[#15120e] max-[720px]:grid-cols-1">
        <div className="border-r border-paper/[0.08] max-[720px]:border-r-0">
          <div className="relative grid h-[210px] place-items-center bg-[linear-gradient(165deg,#241c14,#15120e)]">
            <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-accent/90 text-base text-white shadow-[0_16px_40px_-10px_rgba(187,74,35,0.7)]">
              {"▶"}
            </span>
            <span className="absolute bottom-3 left-3.5 font-mono text-[9.5px] text-paper/60">
              FROM SCARCITY TO SURRENDER
            </span>
          </div>
          <div className="px-4 pb-4 pt-3">
            <div className="h-1 overflow-hidden rounded-full bg-paper/10">
              <span className="block h-full animate-[playbar_12s_linear_infinite_both] rounded-full bg-accent" />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[9px] text-paper/45">
              <span>18:24</span>
              <span>42:10</span>
            </div>
          </div>
        </div>
        <div className="px-[18px] py-4">
          <div className="font-mono text-[9px] tracking-[0.12em] text-paper/50">
            YOUR NOTES
          </div>
          <div className="mt-3 flex flex-col gap-[9px]">
            <span className="h-[5px] w-[92%] rounded-[3px] bg-paper/[0.14]" />
            <span className="h-[5px] w-[78%] rounded-[3px] bg-paper/[0.14]" />
            <span className="h-[5px] w-[86%] rounded-[3px] bg-paper/[0.14]" />
            <span className="flex items-center">
              <span className="h-[5px] w-[38%] rounded-[3px] bg-paper/[0.22]" />
              <span className="ml-[3px] inline-block h-[13px] w-[2px] animate-blink bg-accent" />
            </span>
          </div>
          <div className="mt-4 rounded-[10px] border border-paper/[0.09] bg-[#1e1913] px-3 py-2.5">
            <div className="font-mono text-[8.5px] tracking-[0.1em] text-accent-soft">
              SLIDE 7 OF 12
            </div>
            <b className="mt-[5px] block text-xs">
              {"“"}Surrender isn{"’"}t losing —{"”"}
            </b>
          </div>
        </div>
      </div>
    </Window>
  );
}

/* ——— groups finder: list + map ——— */
function GroupsVisual() {
  return (
    <Window
      side="left"
      offset="-left-5"
      width="w-[640px] max-[980px]:max-w-[640px]"
      delay="0.2s"
    >
      <div className="px-[22px] pb-[22px] pt-[18px] max-[720px]:px-4">
        <div className="flex flex-wrap gap-[7px]">
          <span className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-white">
            Tuesdays {"✕"}
          </span>
          <span className="rounded-full bg-paper/[0.12] px-3 py-1.5 text-[11px] font-semibold">
            Near Cambridge {"✕"}
          </span>
          <span className="rounded-full border border-dashed border-paper/25 px-3 py-1.5 text-[11px] font-semibold text-paper/55">
            + Life stage
          </span>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_0.9fr] gap-3.5 max-[720px]:grid-cols-1">
          <div className="flex flex-col gap-[9px]">
            <div className="animate-[cyc_8s_0.3s_infinite_both] rounded-xl border border-paper/10 bg-[#1e1913] px-3.5 py-3">
              <b className="block text-[13px]">Young Adults</b>
              <span className="text-[11px] text-paper/55">
                Tue · 7 PM · Cambridge
              </span>
              <span className="mt-1.5 block text-[10.5px] font-semibold text-accent-soft">
                3 seats open {"→"}
              </span>
            </div>
            <div className="animate-[cyc_8s_0.6s_infinite_both] rounded-xl border border-paper/10 bg-[#1e1913] px-3.5 py-3">
              <b className="block text-[13px]">Grad Students</b>
              <span className="text-[11px] text-paper/55">
                Tue · 7:30 PM · Central Sq
              </span>
              <span className="mt-1.5 block text-[10.5px] font-semibold text-accent-soft">
                5 seats open {"→"}
              </span>
            </div>
            <div className="flex animate-[cyc_8s_0.9s_infinite_both] items-center gap-2 font-mono text-[10px] text-paper/50">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
              2 groups match your filters
            </div>
          </div>
          <div className="relative min-h-[160px] overflow-hidden rounded-xl border border-paper/[0.08] bg-[#221c15]">
            <span className="absolute left-[12%] top-[70%] h-[3px] w-[76%] -rotate-[24deg] bg-paper/[0.07]" />
            <span className="absolute left-[6%] top-[36%] h-[3px] w-[88%] rotate-12 bg-paper/[0.07]" />
            <span className="absolute left-[30%] top-[6%] h-[88%] w-[3px] rotate-[18deg] bg-paper/[0.07]" />
            <span className="absolute left-[38%] top-[30%] h-[13px] w-[13px] animate-pulse-dot rounded-full border-[2.5px] border-paper bg-accent" />
            <span className="absolute left-[62%] top-[58%] h-[13px] w-[13px] animate-[pulse-dot_2s_0.7s_infinite] rounded-full border-[2.5px] border-paper bg-accent" />
            <span className="absolute left-[22%] top-[66%] h-[11px] w-[11px] rounded-full bg-accent/40" />
            <span className="absolute bottom-2.5 right-2.5 font-mono text-[8.5px] text-paper/40">
              CAMBRIDGE, MA
            </span>
          </div>
        </div>
      </div>
    </Window>
  );
}

/* ——— prefilled giving form ——— */
function GivingVisual() {
  return (
    <Window
      side="right"
      offset="right-10 max-[980px]:right-auto"
      width="w-[460px] max-[980px]:max-w-[460px]"
      delay="0.6s"
    >
      <div className="px-[26px] py-6 max-[720px]:px-4">
        <div className="font-serif text-[23px] tracking-[-0.01em]">
          Give to Grace
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div>
            <div className="font-mono text-[9px] tracking-[0.1em] text-paper/50">
              FUND
            </div>
            <div className="mt-[5px] flex items-center justify-between rounded-[10px] border border-paper/[0.13] bg-[#231d16] px-3 py-2.5 text-[13px] font-semibold">
              General <span className="text-accent-soft">{"✓"}</span>
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] tracking-[0.1em] text-paper/50">
              AMOUNT
            </div>
            <div className="mt-[5px] flex items-center justify-between rounded-[10px] border border-paper/[0.13] bg-[#231d16] px-3 py-2.5 text-[13px] font-semibold">
              $100 <span className="text-accent-soft">{"✓"}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-[7px]">
          {["$50", "$100", "$250", "Other"].map((a) => (
            <span
              key={a}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                a === "$100" ? "bg-accent text-white" : "bg-paper/10"
              }`}
            >
              {a}
            </span>
          ))}
        </div>
        <div className="relative mt-[18px]">
          <span className="grid animate-[clickfill_14s_infinite_both] place-items-center rounded-[11px] bg-accent p-[13px] text-[14.5px] font-semibold text-white">
            Continue to give {"→"}
          </span>
          <span className="absolute left-[58%] top-[55%] z-[3] animate-[cur2_14s_infinite_both]">
            <svg width="19" height="19" viewBox="0 0 24 24">
              <path
                d="M5 3l14 9-6 1.2-3.4 5.8L5 3z"
                fill="#f4f0e8"
                stroke="#1a1611"
                strokeWidth="1.4"
              />
            </svg>
          </span>
        </div>
        <div className="mt-3.5 flex items-center gap-[7px] font-mono text-[9.5px] text-paper/45">
          {"→"} Hands off to your giving platform, prefilled
        </div>
      </div>
    </Window>
  );
}

/* ——— class page ——— */
function ClassVisual() {
  const items = [
    { icon: "▶", label: "Week 1 · Video", delay: "0.2s" },
    { icon: "🎙", label: "Podcast series", delay: "0.45s" },
    { icon: "📄", label: "Study guide", delay: "0.7s" },
  ];
  return (
    <Window
      side="left"
      offset="-left-5"
      width="w-[620px] max-[980px]:max-w-[620px]"
      delay="0.3s"
    >
      <div className="bg-[linear-gradient(165deg,#241c14,#1a1611)] px-7 py-[26px] max-[720px]:px-4">
        <span className="font-mono text-[9px] tracking-[0.12em] text-accent-soft">
          A CLASS AT GRACE
        </span>
        <div className="mt-2 font-serif text-[27px] tracking-[-0.015em]">
          Establishing Foundations
        </div>
        <span className="mt-3 inline-block animate-[cyc_8s_1.2s_infinite_both] rounded-full bg-accent px-[15px] py-2 text-[11.5px] font-semibold text-white">
          Sign up for the next session {"→"}
        </span>
      </div>
      <div className="px-7 pb-6 pt-[18px] max-[720px]:px-4">
        <div className="font-mono text-[9px] tracking-[0.12em] text-paper/50">
          EVERYTHING IN ONE PLACE
        </div>
        <div className="mt-[11px] grid grid-cols-3 gap-2.5 max-[720px]:grid-cols-1">
          {items.map((it) => (
            <div
              key={it.label}
              className="animate-[cyc_8s_infinite_both] rounded-[11px] border border-paper/[0.09] p-[11px]"
              style={{ animationDelay: it.delay }}
            >
              <span className="grid h-[38px] place-items-center rounded-lg bg-[#2a241d] text-xs">
                {it.icon}
              </span>
              <b className="mt-2 block text-[11px]">{it.label}</b>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

export default function Features() {
  return (
    <section className="relative pt-[150px] max-[920px]:pt-24">
      <Glow className="left-1/2 top-[-120px] h-[560px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),rgba(187,74,35,0.05)_55%,transparent_78%)]" />
      <SectionReveal>
        <SectionHead
          animate
          className="px-6"
          kicker="03 // The custom build"
          title="Built for your church."
          titleEm="Feature by feature."
          titleEmMarker
        />
      </SectionReveal>
      <FeatureRow
        reveal
        buttonCta
        num="01"
        className="mt-24 max-[980px]:mt-14"
        side="left"
        tag="FEATURE — DISCIPLESHIP"
        title={"Interactive\nDiscipleship Track"}
        desc="Your pathway, made clickable. People see each step at a glance and can jump into any one at any point."
        link={{ label: "See it live", href: `${LIVE}/next-steps` }}
        visual={<TrackVisual />}
      />
      <FeatureRow
        reveal
        buttonCta
        num="02"
        className="mt-[120px] max-[980px]:mt-16"
        side="right"
        tag="FEATURE — SERMONS"
        title={"Custom Sermon\nExperience"}
        desc="A focused, full-screen view — the video, the slides, and a place to take notes. One page, nothing else."
        link={{
          label: "See it live",
          href: `${LIVE}/watch/from-scarcity-to-surrender-cambridge`,
        }}
        visual={<SermonVisual />}
      />
      <FeatureRow
        reveal
        buttonCta
        num="03"
        className="mt-[120px] max-[980px]:mt-16"
        side="left"
        tag="FEATURE — GROUPS"
        title={"Custom Small\nGroups Finder"}
        desc="List or map, filtered live — by day, location, life stage, or whatever you set up."
        link={{ label: "See it live", href: `${LIVE}/groups` }}
        visual={<GroupsVisual />}
      />
      <FeatureRow
        reveal
        buttonCta
        num="04"
        className="mt-[120px] max-[980px]:mt-16"
        side="right"
        tag="FEATURE — GIVING"
        title={"Built-In\nCustom Giving"}
        desc="Links straight to your giving platform — fund and amount already filled in, so giving takes one tap."
        link={{ label: "See it live", href: `${LIVE}/give` }}
        visual={<GivingVisual />}
      />
      <FeatureRow
        reveal
        buttonCta
        num="05"
        className="mt-[120px] max-[980px]:mt-16"
        side="left"
        tag="FEATURE — CLASSES"
        title={"Custom\nClass Pages"}
        desc="A complete home for each class — videos, podcasts, and everything you teach, with a direct link to sign up."
        link={{
          label: "See it live",
          href: `${LIVE}/establishing-foundations`,
        }}
        visual={<ClassVisual />}
      />
      <AccentBand
        tag={<>✦ FEATURE — WHATEVER YOU DREAM OF</>}
        title={"If it doesn’t exist yet,\nwe build it."}
        sub="A page or tool your church needs that isn’t on this list? Make a list and bring it to our call."
      />
    </section>
  );
}
