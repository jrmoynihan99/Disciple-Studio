import { Btn, Arrow } from "@/components/ui";
import { Glow, Kicker } from "@/app/(site)/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import MarkerReveal from "@/components/reveal-animations/MarkerReveal";
import { LIVE_BUILD_URL } from "./urls";

export default function Hero() {
  return (
    <section className="relative px-6 pt-[180px] text-center max-[920px]:pt-[120px]">
      <Glow className="left-1/2 top-[-180px] h-[640px] w-[1050px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),rgba(187,74,35,0.05)_55%,transparent_75%)]" />
      <SectionReveal className="relative">
        <SubheadingReveal delay={0.4}>
          <Kicker>Vehicle 03 — The CMS</Kicker>
        </SubheadingReveal>
        <h1 className="mt-[26px] font-serif text-[clamp(44px,5.5vw,76px)] leading-[1.03] tracking-[-0.03em] [font-weight:460]">
          <HeadingReveal as="span" className="block">
            Publish once.
          </HeadingReveal>
          <em className="text-accent-soft">
            <MarkerReveal>
              <HeadingReveal as="span" delay={0.15} className="block">
                Live everywhere.
              </HeadingReveal>
            </MarkerReveal>
          </em>
        </h1>
        <Reveal delay={0.5} className="mt-[26px]">
          <p className="mx-auto max-w-[32em] text-[clamp(16px,1.8vw,19px)] leading-[1.55] text-paper/70">
            A CMS built from scratch for your staff — exactly what you need,
            nothing you don{"’"}t.{" "}
            <strong className="font-semibold text-paper">
              Update once, and your website and app both pull from it.
            </strong>
          </p>
        </Reveal>
        <Reveal delay={0.65} className="mt-9 flex flex-wrap justify-center gap-3.5">
          <Btn href="/book">
            Let{"’"}s Chat <Arrow />
          </Btn>
          <Btn
            variant="ghostLight"
            href={LIVE_BUILD_URL}
            target="_blank"
            rel="noreferrer"
          >
            {"▶"} See a live build
          </Btn>
        </Reveal>
      </SectionReveal>
    </section>
  );
}
