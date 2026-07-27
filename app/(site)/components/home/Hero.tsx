import { Btn, Arrow } from "@/components/ui";
import { Glow, Kicker } from "@/app/(site)/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import MarkerReveal from "@/components/reveal-animations/MarkerReveal";
import Carousel from "./Carousel";
import { MEMBER_DEMO_URL } from "./urls";

export default function Hero() {
  return (
    <section className="relative pt-[174px] text-center max-[920px]:pt-[120px]">
      <Glow className="left-1/2 top-[-180px] h-[620px] w-[980px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.2),rgba(187,74,35,0.05)_55%,transparent_75%)]" />
      <SectionReveal>
        <div className="relative px-6">
          <SubheadingReveal delay={0.4}>
            <Kicker>A studio for the local church</Kicker>
          </SubheadingReveal>
          <h1 className="mt-[26px] font-serif text-[clamp(46px,6.2vw,88px)] leading-[1.02] tracking-[-0.03em] [font-weight:460]">
            <HeadingReveal as="span" className="block">
              A digital ecosystem,
            </HeadingReveal>
            <em className="text-accent-soft">
              <MarkerReveal>
                <HeadingReveal as="span" delay={0.15} className="block">
                  built to disciple.
                </HeadingReveal>
              </MarkerReveal>
            </em>
          </h1>
          <Reveal delay={0.5} className="mt-7">
            <p className="mx-auto max-w-[33em] text-[clamp(16px,1.8vw,19px)] leading-[1.55] text-paper/70">
              <strong className="font-semibold text-paper">
                Know every member. Move every one.
              </strong>{" "}
              A complete discipleship engine that knows each person in your
              church, makes their next step clear, and helps them take it.
            </p>
          </Reveal>
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
              {"▶"} Try the member demo
            </Btn>
          </Reveal>
        </div>
        <Reveal delay={0.85}>
          <Carousel />
        </Reveal>
      </SectionReveal>
    </section>
  );
}
