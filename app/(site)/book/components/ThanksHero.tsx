import { Btn, Wrap } from "@/components/ui";
import { DemoLabel, Glow, Kicker } from "@/app/(site)/components/ui";
import type { Booked } from "@/app/(site)/components/schedule/ScheduleCall";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import {
  LIVE_SITE_URL,
  MEMBER_DEMO_URL,
} from "@/app/(site)/components/home/urls";

/* Post-booking confirmation hero. Rendered two ways: swapped into /book the
   moment ScheduleCall reports the booking (with the real time, email, and
   reschedule links), and as the standalone /book/thanks page — which has no
   booking details, so everything specific is optional. */

const whenFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const STEPS: [string, string][] = [
  ["01", "A calendar invite lands in your inbox"],
  ["02", "We hop on the call — no prep needed"],
  ["03", "If it feels like a fit, we talk next steps"],
];

export default function ThanksHero({ booked }: { booked?: Booked }) {
  return (
    <section className="relative px-6 pb-24 pt-[180px] text-center max-[920px]:pt-[130px]">
      <Glow className="left-1/2 top-[20px] h-[700px] w-[1180px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.3),rgba(187,74,35,0.09)_55%,transparent_82%)] max-[920px]:top-[-40px]" />
      <Wrap className="relative">
        <SectionReveal className="mx-auto max-w-[720px]">
          <Reveal delay={0.15}>
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-accent-soft/40 bg-accent/15 text-accent-soft">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M4.5 12.5l5 5 10-11"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Reveal>
          <SubheadingReveal delay={0.45} className="mt-8">
            <Kicker>You{"’"}re booked</Kicker>
          </SubheadingReveal>
          <h1 className="mt-[24px] font-serif text-[clamp(38px,4.8vw,58px)] leading-[1.04] tracking-[-0.03em] [font-weight:460]">
            <HeadingReveal as="span" className="block">
              You’re all set.
            </HeadingReveal>
            <em className="text-accent-soft">
              <HeadingReveal as="span" delay={0.15} className="block">
                Talk soon.
              </HeadingReveal>
            </em>
          </h1>
          <ParagraphReveal
            delay={0.5}
            className="mx-auto mt-6 max-w-[32em] text-[clamp(16px,1.7vw,18px)] leading-[1.6] text-paper/70"
          >
            {booked
              ? `A calendar invite with your Google Meet link is on its way to ${booked.email}.`
              : "A calendar invite with the meeting link is on its way to your inbox. Need a different time? There are reschedule links right in that email."}
          </ParagraphReveal>
          {booked && (
            <Reveal delay={0.55} className="mx-auto mt-7 max-w-[420px]">
              <div className="rounded-[14px] border border-paper/12 bg-paper/[0.04] px-5 py-4">
                <p className="m-0 font-mono text-[12.5px] tracking-[0.06em] text-paper/70">
                  {whenFmt.format(new Date(booked.startTime))} ·{" "}
                  {booked.duration} MIN
                </p>
                <div className="mt-2.5 flex items-center justify-center gap-5 text-[13.5px]">
                  <a
                    href={booked.rescheduleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent-soft underline underline-offset-[3px] transition-colors hover:text-accent-glow"
                  >
                    Reschedule
                  </a>
                  <a
                    href={booked.cancelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-paper/50 underline underline-offset-[3px] transition-colors hover:text-paper/80"
                  >
                    Cancel
                  </a>
                </div>
              </div>
            </Reveal>
          )}
          <Reveal
            delay={0.6}
            className="mx-auto mt-11 grid max-w-[680px] grid-cols-3 gap-3 max-[720px]:grid-cols-1"
          >
            {STEPS.map(([n, text]) => (
              <div
                key={n}
                className="rounded-[14px] border border-paper/10 bg-paper/[0.04] px-[18px] py-4 text-left"
              >
                <div className="font-mono text-[11px] tracking-[0.08em] text-accent-soft">
                  {n}
                </div>
                <div className="mt-1.5 text-[13.5px] leading-[1.5] text-paper/70">
                  {text}
                </div>
              </div>
            ))}
          </Reveal>
          <Reveal
            delay={0.7}
            className="mt-11 flex flex-wrap justify-center gap-3.5"
          >
            <Btn href={LIVE_SITE_URL} target="_blank" rel="noreferrer">
              See our latest build {"↗"}
            </Btn>
            <Btn
              variant="ghostLight"
              href={MEMBER_DEMO_URL}
              target="_blank"
              rel="noreferrer"
            >
              <DemoLabel />
            </Btn>
          </Reveal>
        </SectionReveal>
      </Wrap>
    </section>
  );
}
