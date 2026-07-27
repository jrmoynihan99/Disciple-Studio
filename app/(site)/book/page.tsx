import type { Metadata } from "next";
import Nav from "@/app/(site)/components/Nav";
import { Wrap } from "@/components/ui";
import { Glow, Kicker } from "@/app/(site)/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import GlowReveal from "@/components/reveal-animations/GlowReveal";

export const metadata: Metadata = {
  title: "Let’s Chat — Disciple Studio",
  description:
    "Pick a time for a quick call — tell us about your church and see how we can help.",
};

const CALENDLY_URL = "https://calendly.com/jrmoynihan99/30min";
/* Colors match the v3 palette so the embed doesn't flash a light panel. */
const CALENDLY_PARAMS =
  "embed_type=Inline&hide_gdpr_banner=1&background_color=1a1611&text_color=f4f0e8&primary_color=bb4a23";

export default function BookPage() {
  return (
    <>
      <Nav active="/book" />
      <main>
        <section className="relative px-6 pb-24 pt-[180px] max-[920px]:pt-[120px]">
          <Glow className="left-1/2 top-[-180px] h-[640px] w-[1050px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),rgba(187,74,35,0.05)_55%,transparent_75%)]" />
          <Wrap className="relative">
            <SectionReveal className="grid grid-cols-[0.45fr_0.55fr] items-start gap-14 max-[860px]:grid-cols-1 max-[860px]:gap-10">
              <div className="max-w-[460px] max-[860px]:mx-auto max-[860px]:text-center">
                <SubheadingReveal delay={0.4}>
                  <Kicker>Pick a time</Kicker>
                </SubheadingReveal>
                <h1 className="mt-[26px] font-serif text-[clamp(36px,4.4vw,52px)] leading-[1.04] tracking-[-0.03em] [font-weight:460]">
                  <HeadingReveal as="span" className="block">
                    Let’s talk about
                  </HeadingReveal>
                  <em className="text-accent-soft">
                    <HeadingReveal as="span" delay={0.15} className="block">
                      your church.
                    </HeadingReveal>
                  </em>
                </h1>
                <ParagraphReveal
                  delay={0.5}
                  className="mt-6 text-[clamp(16px,1.7vw,18px)] leading-[1.6] text-paper/70"
                >
                  Pick a time that works for you. We’ll hop on a quick call to
                  hear about your church, answer any questions, and see how we
                  can help!
                </ParagraphReveal>
                <Reveal delay={0.6} className="mt-4">
                  <p className="text-[15px] leading-[1.6] text-paper/60">
                    Or email us here:{" "}
                    <a
                      href="mailto:jrmoynihan99@gmail.com"
                      className="font-medium text-accent-soft underline underline-offset-[3px] transition-colors hover:text-accent-glow"
                    >
                      jrmoynihan99@gmail.com
                    </a>
                  </p>
                </Reveal>
              </div>
              <GlowReveal
                delay={0.2}
                className="group relative min-w-0"
                glow={
                  /* Same halo as the home page visuals, no bottom fade here —
                     the calendar stays fully readable to its last row. */
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-x-24 -inset-y-16 opacity-55 transition-opacity duration-500 [-webkit-mask-repeat:no-repeat] [mask-repeat:no-repeat] group-hover:opacity-75"
                  >
                    <div className="absolute inset-x-24 inset-y-16 rounded-[44px] border-[30px] border-accent blur-[26px]" />
                  </div>
                }
              >
                <div className="relative rounded-[30px] border border-paper/15 bg-paper/[0.03] p-3 transition-colors duration-500 group-hover:border-paper/25">
                  <div
                    className="relative w-full min-w-0 overflow-hidden rounded-[22px] border border-paper/10 bg-[#1a1611]"
                    style={{ height: 900 }}
                  >
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="font-mono text-xs tracking-[0.05em] text-paper/45">
                        loading calendar…
                      </span>
                    </div>
                    <iframe
                      src={`${CALENDLY_URL}?${CALENDLY_PARAMS}`}
                      title="Schedule a call with Disciple Studio"
                      className="relative h-full w-full border-0"
                    />
                  </div>
                </div>
              </GlowReveal>
            </SectionReveal>
          </Wrap>
        </section>
      </main>
    </>
  );
}
