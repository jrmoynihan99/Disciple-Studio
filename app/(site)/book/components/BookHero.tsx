"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Wrap } from "@/components/ui";
import { Glow, Kicker } from "@/app/(site)/components/ui";
import TestimonialCard from "@/app/(site)/components/TestimonialCard";
import ScheduleCall, {
  type Booked,
} from "@/app/(site)/components/schedule/ScheduleCall";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import GlowReveal from "@/components/reveal-animations/GlowReveal";
import ThanksHero from "./ThanksHero";

const EASE = [0.08, 0.82, 0.17, 1] as [number, number, number, number];

/* Client so the page can react to the booking itself: the moment
   ScheduleCall reports success, the whole hero swaps to the thank-you —
   with the real time, email, and reschedule links. Below-the-fold sections
   stay server-rendered. */
export default function BookHero() {
  const [booked, setBooked] = useState<Booked | null>(null);

  const handleBooked = useCallback((b: Booked) => {
    setBooked(b);
    window.scrollTo(0, 0);
    /* Give the state a real URL — refresh keeps a confirmation, since the
       standalone /book/thanks page renders this same hero. */
    window.history.replaceState(null, "", "/book/thanks");
  }, []);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {booked ? (
        <motion.div
          key="thanks"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <ThanksHero booked={booked} />
        </motion.div>
      ) : (
        <motion.div
          key="booking"
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <section className="relative px-6 pb-24 pt-[180px] max-[920px]:pt-[120px]">
            <Glow className="left-1/2 top-[20px] h-[760px] w-[1180px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.32),rgba(187,74,35,0.1)_55%,transparent_82%)] max-[920px]:top-[-60px]" />
            <Wrap className="relative">
              {/* Desktop: the scheduler owns the right column across both
                  rows; text row 1 / testimonial row 2 fill the space beside
                  it. Mobile: single column in DOM order — text, scheduler,
                  testimonial — so booking never gets pushed down. */}
              <SectionReveal className="grid grid-cols-[0.45fr_0.55fr] grid-rows-[auto_1fr] items-start gap-x-14 gap-y-12 max-[860px]:grid-cols-1 max-[860px]:grid-rows-none max-[860px]:gap-10">
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
                    Pick a time that works for you. We’ll hop on a quick call
                    to hear about your church, answer any questions, and see
                    how we can help!
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
                  className="group relative col-start-2 row-span-2 row-start-1 min-w-0 max-[860px]:col-auto max-[860px]:row-auto"
                  glow={
                    /* Same halo as the home page visuals, no bottom fade here —
                       the scheduler stays fully readable to its last row. */
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -inset-x-24 -inset-y-16 opacity-55 transition-opacity duration-500 [-webkit-mask-repeat:no-repeat] [mask-repeat:no-repeat] group-hover:opacity-75"
                    >
                      <div className="absolute inset-x-24 inset-y-16 rounded-[44px] border-[30px] border-accent blur-[26px]" />
                    </div>
                  }
                >
                  <div className="relative rounded-[30px] border border-paper/15 bg-paper/[0.03] p-3 transition-colors duration-500 group-hover:border-paper/25">
                    <div className="relative w-full min-w-0 overflow-hidden rounded-[22px] border border-paper/10 bg-[#1a1611] p-6 sm:p-7">
                      <ScheduleCall onBooked={handleBooked} />
                    </div>
                  </div>
                </GlowReveal>
                <Reveal
                  delay={0.75}
                  className="col-start-1 row-start-2 max-w-[460px] max-[860px]:col-auto max-[860px]:row-auto max-[860px]:mx-auto max-[860px]:w-full max-[860px]:max-w-[440px]"
                >
                  <TestimonialCard />
                </Reveal>
              </SectionReveal>
            </Wrap>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
