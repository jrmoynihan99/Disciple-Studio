import Image from "next/image";
import { Btn, Arrow } from "@/components/ui";
import { Glow, Kicker } from "@/app/(site)/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import MarkerReveal from "@/components/reveal-animations/MarkerReveal";
import { MEMBER_DEMO_URL } from "./urls";

/* Final CTA + site footer. Differs from the shared FinalCTA: it has a
   kicker + sub copy, and the footer's right side is the copyright line. */
export default function Closing() {
  return (
    <section className="relative overflow-hidden border-t border-paper/[0.07] px-6 pb-[90px] pt-[130px] text-center max-[920px]:pb-16 max-[920px]:pt-20">
      <Glow className="bottom-[-160px] left-1/2 h-[820px] w-[1500px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.26),rgba(187,74,35,0.07)_55%,transparent_78%)]" />
      <SectionReveal className="relative">
        <SubheadingReveal delay={0.4}>
          <Kicker>Let{"’"}s build yours</Kicker>
        </SubheadingReveal>
        <h2 className="mt-6 font-serif text-[clamp(38px,5vw,64px)] leading-[1.04] tracking-[-0.028em] [font-weight:460]">
          <HeadingReveal as="span" className="block">
            We’d love to hear
          </HeadingReveal>
          <em className="text-accent-soft">
            <MarkerReveal>
              <HeadingReveal as="span" delay={0.15} className="block">
                your church’s story.
              </HeadingReveal>
            </MarkerReveal>
          </em>
        </h2>
        <ParagraphReveal
          delay={0.5}
          className="mx-auto mt-6 max-w-[31em] text-[clamp(16px,1.8vw,18px)] leading-[1.55] text-paper/70"
        >
          Hop on a 20-minute call and tell us about your church — what’s
          working, what’s not, and what you dream it could be.
        </ParagraphReveal>
        <Reveal delay={0.65} className="mt-[38px] flex flex-wrap justify-center gap-3.5">
          <Btn href="/book">
            Let{"’"}s Chat <Arrow />
          </Btn>
          <Btn
            variant="ghostLight"
            href={MEMBER_DEMO_URL}
            target="_blank"
            rel="noreferrer"
          >
            {"▶"} See a live demo
          </Btn>
        </Reveal>
        <div className="mt-[100px] flex items-center justify-between border-t border-paper/[0.08] pt-[22px] font-mono text-[11px] text-paper/45 max-[720px]:flex-col max-[720px]:gap-4">
          <span className="inline-flex items-center gap-2">
            {/* alt="" — the wordmark right beside it already carries the name.
                rounded-md matches the tile the accent square used to be. */}
            <Image
              src="/logoFlipped.png"
              alt=""
              width={48}
              height={48}
              className="h-6 w-6 flex-none rounded-md"
            />
            Disciple Studio
          </span>
          <span>© 2026 · For the local church</span>
        </div>
      </SectionReveal>
    </section>
  );
}
