import type { ReactNode } from "react";
import { Glow, SectionHead } from "@/app/(site)/components/ui";
import ScrollFeatureRail from "@/app/(site)/components/ScrollFeatureRail";
import { Wrap } from "@/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-paper/10 bg-[#1f1a14] px-[30px] py-[26px] shadow-[0_40px_110px_-40px_rgba(187,74,35,0.35)] max-[720px]:px-5">
      {children}
    </div>
  );
}

/* Sender row on a message card — same mark/church/timestamp shape the
   push notifications use elsewhere, so a message reads as the same
   thing whether it lands on the lock screen or on her page. */
function MsgHead({ time, soft = false }: { time: string; soft?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-[22px] w-[22px] place-items-center rounded-[7px] bg-accent text-[11px] text-white">
        {"✝"}
      </span>
      <span
        className={`font-mono text-[9.5px] tracking-[0.1em] ${
          soft ? "text-paper/55" : "text-accent-soft"
        }`}
      >
        GRACE FELLOWSHIP
      </span>
      <span className="ml-auto text-[11px] text-paper/45">{time}</span>
    </div>
  );
}

export default function MemberRail() {
  const panels = [
    /* 01 — pathway checklist */
    <Panel key="next-step">
      <div className="font-serif text-[26px] tracking-[-0.01em]">
        Welcome back, Sarah.
      </div>
      <div className="mt-[18px] flex flex-col gap-2">
        {["Baptism", "Membership Class"].map((t, i) => (
          <div
            key={t}
            className="flex animate-[cyc_8s_infinite_both] items-center gap-[13px] rounded-[11px] bg-[#262019] px-[15px] py-[11px]"
            style={{ animationDelay: i === 0 ? "0.2s" : "0.55s" }}
          >
            <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-accent text-[11px] text-white">
              {"✓"}
            </span>
            <span className="text-[14.5px] font-semibold text-paper/50">
              {t}
            </span>
          </div>
        ))}
        <div className="animate-[cyc_8s_0.95s_infinite_both] rounded-[14px] border-[1.5px] border-accent/55 bg-accent/[0.13] px-[18px] py-4 shadow-[0_18px_34px_-22px_rgba(187,74,35,0.5)]">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-accent-soft">
            <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" />
            YOUR NEXT STEP
          </div>
          <div className="mt-2 flex items-center justify-between gap-3.5">
            <b className="font-serif text-[21px] font-medium">
              Join a Community Group
            </b>
            <span className="flex-none rounded-full bg-accent px-[17px] py-2.5 text-[13px] font-semibold text-white">
              Find a group {"→"}
            </span>
          </div>
        </div>
        <div className="flex animate-[cyc_8s_1.35s_infinite_both] items-center gap-[13px] rounded-[11px] border border-dashed border-paper/20 px-[15px] py-[11px]">
          <span className="h-5 w-5 rounded-full border-2 border-paper/20" />
          <span className="text-[14.5px] font-semibold text-paper/50">
            Join a Serve Team
          </span>
          <span className="ml-auto font-mono text-[9.5px] tracking-[0.08em] text-paper/45">
            UP NEXT
          </span>
        </div>
      </div>
    </Panel>,

    /* 02 — messages sent to her, not to everyone */
    <Panel key="messages">
      <div className="flex items-center justify-between">
        <b className="font-serif text-[22px] font-medium">Messages</b>
        <span className="rounded-full bg-accent/[0.16] px-2.5 py-1 font-mono text-[9px] tracking-[0.1em] text-accent-soft">
          FOR YOU
        </span>
      </div>
      <div className="mt-[18px] animate-[cyc_8s_0.25s_infinite_both] rounded-[14px] border-[1.5px] border-accent/55 bg-accent/[0.13] px-[18px] py-4 shadow-[0_18px_34px_-22px_rgba(187,74,35,0.5)]">
        <MsgHead time="now" />
        <b className="mt-2.5 block font-serif text-[19px] font-medium">
          Group Launch Night — Thursday
        </b>
        <span className="mt-1 block text-[13px] text-paper/65">
          You{"’"}re not in a group yet. This is the easiest way in.
        </span>
        <span className="mt-3.5 inline-block rounded-full bg-accent px-[17px] py-2.5 text-[13px] font-semibold text-white">
          Save my spot {"→"}
        </span>
      </div>
      <div className="mt-2.5 animate-[cyc_8s_0.7s_infinite_both] rounded-[14px] border border-paper/[0.09] bg-[#262019] px-[15px] py-[13px]">
        <MsgHead time="2d" soft />
        <b className="mt-2 block text-[13.5px]">Serve Day — Saturday, 9 AM</b>
        <span className="mt-px block text-[12px] text-paper/60">
          The food pantry needs four more hands.
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[12.5px] text-paper/55">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
        Sent to the 64 members it applies to — not all 542
      </div>
    </Panel>,

    /* 03 — their group */
    <Panel key="group">
      <div className="flex items-center justify-between">
        <b className="font-serif text-[22px] font-medium">
          Young Adults · Cambridge
        </b>
        <span className="rounded-full bg-accent/[0.16] px-2.5 py-1 font-mono text-[9px] tracking-[0.1em] text-accent-soft">
          YOUR GROUP
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2.5">
        <span className="flex">
          {[
            ["S", "bg-[#3a332a]", ""],
            ["M", "bg-[#4a4034]", "-ml-2.5"],
            ["J", "bg-[#5a4a38]", "-ml-2.5"],
            ["+9", "bg-[#3a332a]", "-ml-2.5"],
          ].map(([t, bg, ml]) => (
            <span
              key={t}
              className={`grid h-[34px] w-[34px] place-items-center rounded-full border-2 border-[#1f1a14] text-[11px] font-bold ${bg} ${ml}`}
            >
              {t}
            </span>
          ))}
        </span>
        <span className="text-[13px] text-paper/55">12 members</span>
      </div>
      <div className="mt-[18px] grid grid-cols-2 gap-2.5 max-[720px]:grid-cols-1">
        <div className="rounded-xl border border-paper/[0.09] bg-[#262019] px-[15px] py-[13px]">
          <div className="font-mono text-[9px] tracking-[0.1em] text-paper/50">
            NEXT MEETING
          </div>
          <b className="mt-[5px] block text-sm">Tuesday · 7:00 PM</b>
          <span className="text-[11.5px] text-paper/55">
            The Hendersons{"’"} · Cambridge
          </span>
        </div>
        <div className="rounded-xl border border-paper/[0.09] bg-[#262019] px-[15px] py-[13px]">
          <div className="font-mono text-[9px] tracking-[0.1em] text-paper/50">
            THIS WEEK
          </div>
          <b className="mt-[5px] block text-sm">Luke 15 · Week 3</b>
          <span className="text-[11.5px] text-paper/55">
            Discussion guide ready
          </span>
        </div>
      </div>
      <div className="mt-[18px] flex flex-wrap gap-2.5">
        <span className="rounded-full bg-accent px-[17px] py-2.5 text-[13px] font-semibold text-white">
          Message the group
        </span>
        <span className="rounded-full px-[17px] py-2.5 text-[13px] font-semibold text-paper/80 shadow-[inset_0_0_0_1.5px_rgba(244,240,232,0.2)]">
          Get directions
        </span>
      </div>
    </Panel>,

    /* 04 — prefilled giving */
    <Panel key="give">
      <div className="flex items-center justify-between">
        <b className="font-serif text-[22px] font-medium">Give</b>
        <span className="font-mono text-[9.5px] tracking-[0.1em] text-paper/50">
          LINKED TO YOUR PLATFORM
        </span>
      </div>
      <div className="mt-[18px] grid grid-cols-2 gap-2.5 max-[720px]:grid-cols-1">
        <div>
          <div className="font-mono text-[9px] tracking-[0.1em] text-paper/50">
            FUND
          </div>
          <div className="mt-[5px] flex items-center justify-between rounded-[10px] border border-paper/[0.13] bg-[#262019] px-[13px] py-[11px] text-[13.5px] font-semibold">
            General · Cambridge <span className="text-accent-soft">{"✓"}</span>
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] tracking-[0.1em] text-paper/50">
            AMOUNT
          </div>
          <div className="mt-[5px] flex items-center justify-between rounded-[10px] border border-paper/[0.13] bg-[#262019] px-[13px] py-[11px] text-[13.5px] font-semibold">
            $250 · monthly <span className="text-accent-soft">{"✓"}</span>
          </div>
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-2 text-[12.5px] text-paper/55">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
        Prefilled from Sarah{"’"}s profile — one tap to give
      </div>
      <div className="relative mt-4">
        <span className="grid animate-[clickfill_14s_infinite_both] place-items-center rounded-[11px] bg-accent p-[13px] text-[15px] font-semibold text-white">
          Give $250
        </span>
        <span className="absolute left-[58%] top-[55%] z-[3] animate-[cur2_14s_infinite_both]">
          <svg width="19" height="19" viewBox="0 0 24 24">
            <path
              d="M5 3l14 9-6 1.2-3.4 5.8L5 3z"
              fill="#f4f0e8"
              stroke="#1f1a14"
              strokeWidth="1.4"
            />
          </svg>
        </span>
      </div>
    </Panel>,

    /* 05 — their campus */
    <Panel key="campus">
      <div className="flex items-center justify-between gap-3 max-[720px]:flex-col max-[720px]:items-start">
        <b className="font-serif text-[22px] font-medium">
          This week at Cambridge
        </b>
        <span className="inline-flex gap-1.5">
          <span className="rounded-full bg-accent px-2.5 py-1 font-mono text-[9px] tracking-[0.08em] text-white">
            CAMBRIDGE
          </span>
          <span className="rounded-full border border-paper/20 px-2.5 py-1 font-mono text-[9px] tracking-[0.08em] text-paper/55">
            BOSTON
          </span>
        </span>
      </div>
      {[
        {
          day: "SUN",
          title: "Services · 9:00 & 11:00 AM",
          sub: "454 Massachusetts Ave",
          delay: "0.2s",
          mt: "mt-4",
        },
        {
          day: "THU",
          title: "Group Launch Night",
          sub: "Cambridge campus · 7:00 PM",
          delay: "0.5s",
          mt: "mt-2",
        },
        {
          day: "SAT",
          title: "Serve Day · Food Pantry",
          sub: "Sign-ups open · 3 spots left",
          delay: "0.8s",
          mt: "mt-2",
        },
      ].map((r) => (
        <div
          key={r.day}
          className={`${r.mt} flex animate-[cyc_8s_infinite_both] items-center gap-2.5 rounded-xl border border-paper/[0.09] bg-[#262019] px-[15px] py-[13px]`}
          style={{ animationDelay: r.delay }}
        >
          <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-accent/[0.16] font-mono text-[9px] text-accent-soft">
            {r.day}
          </span>
          <div>
            <b className="block text-[13.5px]">{r.title}</b>
            <span className="text-[11.5px] text-paper/55">{r.sub}</span>
          </div>
        </div>
      ))}
    </Panel>,
  ];

  return (
    <section className="relative pt-[130px] max-[920px]:pt-20">
      <Glow className="left-1/2 top-[-120px] h-[560px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),rgba(187,74,35,0.05)_55%,transparent_78%)]" />
      <Wrap>
        <SectionReveal>
          <SectionHead
            animate
            kicker="02 // Signed in"
            title={"One login.\nEverything is theirs."}
          />
        </SectionReveal>
        <ScrollFeatureRail
          items={[
            {
              title: "Their exact next step",
              desc: "One clear step on the pathway your church defines — front and center.",
            },
            {
              title: "Messages meant for them",
              desc: "Send to only the members it applies to — waiting on their page the next time they sign in.",
            },
            {
              title: "Their group, built in",
              desc: "Meeting time, their people, and a way to reach them — one tap away.",
            },
            {
              title: "Giving that knows them",
              desc: "Fund and amount already filled in, linked to your giving platform.",
            },
            {
              title: "Their campus, everywhere",
              desc: "Times, events, and sermons for the campus they actually attend.",
            },
          ]}
          panels={panels}
        />
      </Wrap>
    </section>
  );
}
