import type { ReactNode } from "react";
import { Glow, SectionHead } from "@/app/(site)/components/ui";
import ScrollFeatureRail from "@/app/(site)/components/ScrollFeatureRail";
import PhoneFrame from "@/app/(site)/components/PhoneFrame";
import { Wrap } from "@/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";

/* Top half of a phone fading out toward the bottom — same mask trick
   as the login demo, sized for the rail panel. `caption` sits beneath
   the fade; `aside` floats a card over the phone's edge. */
function PhonePanel({
  caption,
  aside,
  children,
}: {
  caption?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <Glow className="left-1/2 top-[42%] h-[560px] w-[620px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.16),transparent_75%)]" />
      {/* Phone-hugging halo, same as the login demo but sized for the
         290px phone. Its mask dies out just before the frame's does so
         the bloom never shows through the faded bottom. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 bottom-0 opacity-85 [-webkit-mask-image:linear-gradient(to_bottom,#000_50%,transparent_85%)] [-webkit-mask-repeat:no-repeat] [mask-image:linear-gradient(to_bottom,#000_50%,transparent_85%)] [mask-repeat:no-repeat]"
      >
        <div className="absolute -bottom-56 left-1/2 top-[54px] w-[268px] -translate-x-1/2 rounded-[38px] border-[18px] border-accent blur-[20px]" />
      </div>
      <div className="relative h-[470px] overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,#000_62%,transparent_97%)] [mask-image:linear-gradient(to_bottom,#000_62%,transparent_97%)]">
        <div className="mx-auto w-[290px]">
          <PhoneFrame size="sm" screenClassName="h-[560px]">
            {children}
          </PhoneFrame>
        </div>
      </div>
      {caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex items-center justify-center gap-2 font-mono text-[10px] text-paper/55">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
          {caption}
        </div>
      )}
      {aside}
    </div>
  );
}

function Notif({
  title,
  body,
  time,
  className = "",
}: {
  title: string;
  body: string;
  time: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-paper/[0.12] bg-[#2a241d] px-4 py-3.5 shadow-[0_22px_40px_-24px_rgba(0,0,0,0.8)] ${className}`}
    >
      <div className="flex items-center gap-[9px]">
        <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-accent text-xs text-white">
          {"✝"}
        </span>
        <span className="text-[11.5px] font-semibold text-paper/80">
          GRACE FELLOWSHIP
        </span>
        <span className="ml-auto text-[11px] text-paper/50">{time}</span>
      </div>
      <b className="mt-[9px] block text-[14.5px]">{title}</b>
      <span className="mt-0.5 block text-[13px] text-paper/65">{body}</span>
    </div>
  );
}

export default function EngineRail() {
  const panels = [
    /* 01 — lock screen nudges, timed by the engine */
    <PhonePanel key="lock" caption="Timed by the engine — configurable by you">
      <div className="pt-12 text-center">
        <div className="font-mono text-[10px] tracking-[0.14em] text-paper/55">
          SUNDAY, AUGUST 9
        </div>
        <div className="mt-1 font-serif text-[54px] leading-none tracking-[-0.02em]">
          6:12
        </div>
      </div>
      <div className="px-3 pt-6">
        <Notif
          className="animate-[cyc_8s_0.3s_infinite_both]"
          title="Your next step is ready"
          body="6 serve teams have open spots near you."
          time="now"
        />
        <Notif
          className="mt-2.5 animate-[cyc_8s_0.8s_infinite_both]"
          title="Your group meets Tuesday"
          body="Luke 15 · Week 3 — guide is ready."
          time="Sun"
        />
      </div>
    </PhonePanel>,

    /* 02 — targeted messaging: push + home banner, sent from the CMS */
    <PhonePanel
      key="target"
      caption="Push + home banner — sent from your CMS"
      aside={
        <div className="absolute right-0 top-[110px] z-[2] w-[218px] animate-[bob_7s_0.6s_ease-in-out_infinite] rounded-2xl border border-paper/[0.13] bg-[#1e1913] px-4 py-3.5 shadow-[0_40px_80px_-35px_rgba(0,0,0,0.95)] max-[980px]:hidden">
          <div className="font-mono text-[9px] tracking-[0.1em] text-paper/50">
            FROM YOUR BACKEND
          </div>
          <div className="mt-2.5 flex items-start gap-2 text-[11.5px] font-semibold leading-[1.35] text-accent-soft">
            <span className="mt-1 h-[7px] w-[7px] flex-none animate-pulse-dot rounded-full bg-accent" />
            46 members have {"“"}Baptism{"”"} as their next step
          </div>
          <div className="mt-2.5 flex gap-1.5">
            <span className="rounded-full bg-accent/[0.16] px-2.5 py-1 text-[9.5px] font-semibold text-accent-soft">
              Push {"✓"}
            </span>
            <span className="rounded-full bg-accent/[0.16] px-2.5 py-1 text-[9.5px] font-semibold text-accent-soft">
              Banner {"✓"}
            </span>
          </div>
          <span className="mt-3 inline-flex rounded-full bg-accent px-3.5 py-2 text-[11px] font-semibold text-white">
            Send to 46 {"→"}
          </span>
        </div>
      }
    >
      <div className="h-[46px]" />
      <div className="mx-2.5 animate-[cyc_8s_0.4s_infinite_both]">
        <Notif
          title="Baptism Sunday — Aug 9"
          body="Your next step: sign up to be baptized."
          time="now"
        />
      </div>
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="font-serif text-[21px]">Hi, Sarah.</div>
          <span className="rounded-full bg-accent/[0.16] px-2 py-1 font-mono text-[7.5px] tracking-[0.08em] text-accent-soft">
            CAMBRIDGE
          </span>
        </div>
        <div className="mt-2.5 animate-[cyc_8s_0.9s_infinite_both] rounded-[13px] bg-accent px-[13px] py-2.5 shadow-[0_18px_34px_-18px_rgba(187,74,35,0.7)]">
          <div className="font-mono text-[7.5px] tracking-[0.12em] text-white/70">
            THIS SUNDAY
          </div>
          <b className="mt-0.5 block text-[12.5px] text-white">
            Baptism Sunday — Aug 9
          </b>
          <span className="mt-0.5 block text-[10.5px] font-semibold text-white/85">
            Sign up to be baptized {"→"}
          </span>
        </div>
        <div className="mt-2.5 rounded-[13px] border border-paper/10 bg-[#1e1913] px-3 py-2.5">
          <div className="font-mono text-[7.5px] tracking-[0.1em] text-paper/50">
            YOUR NEXT STEP
          </div>
          <b className="mt-0.5 block text-[11.5px]">Join a Community Group</b>
        </div>
      </div>
    </PhonePanel>,

    /* 03 — profile wizard */
    <PhonePanel
      key="profile"
      caption={<>{"⇄"} Writes straight into Planning Center</>}
    >
      <div className="h-[54px]" />
      <div className="px-4">
        <div className="flex items-center justify-between">
          <b className="font-serif text-lg font-medium">
            Complete your profile
          </b>
          <span className="font-mono text-[9px] tracking-[0.1em] text-paper/50">
            4 OF 5
          </span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1 flex-1 rounded-full bg-accent" />
          ))}
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-paper/15">
            <span className="block h-full w-full origin-left animate-[barcyc_8s_0.4s_cubic-bezier(0.2,0.8,0.2,1)_infinite_both] bg-accent" />
          </span>
          <span className="h-1 flex-1 rounded-full bg-paper/15" />
        </div>
        <div className="mt-6 font-serif text-[21px] tracking-[-0.01em]">
          Have you been baptized?
        </div>
        <div className="mt-3.5 flex gap-2.5">
          <span className="grid flex-1 place-items-center rounded-xl bg-accent p-3 text-[14px] font-semibold text-white">
            Yes
          </span>
          <span className="grid flex-1 place-items-center rounded-xl border-[1.5px] border-paper/20 p-3 text-[14px] font-semibold text-paper/65">
            Not yet
          </span>
        </div>
      </div>
    </PhonePanel>,
  ];

  return (
    <section className="relative pt-[130px] max-[920px]:pt-20">
      <Glow className="left-1/2 top-[-120px] h-[560px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),rgba(187,74,35,0.05)_55%,transparent_78%)]" />
      <Wrap>
        <SectionReveal>
          <SectionHead
            animate
            kicker="02 // The engine, in the app"
            title={"It doesn't wait to be opened.\nNow you can reach them."}
          />
        </SectionReveal>
        <ScrollFeatureRail
          items={[
            {
              title: "Next steps, pushed to them",
              desc: "The engine nudges each member when their next step is ready — perfectly timed, right on the lock screen.",
            },
            {
              title: "Reach exactly the right people",
              desc: "Send push notifications and home page banners to exactly the right segment of people — an event, a next step, anything you want to direct them to.",
            },
            {
              title: "Profiles that fill your backend",
              desc: "A quick wizard on first sign-in — every answer syncs straight to your ChMS, offloading data completion to your members.",
            },
          ]}
          panels={panels}
        />
      </Wrap>
    </section>
  );
}
