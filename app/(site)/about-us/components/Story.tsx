import { DATA } from "@/app/data";
import { Wrap } from "@/components/ui";
import { Glow, Kicker } from "@/app/(site)/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import { withLinks } from "./links";

export default function Story() {
  const s = DATA.aboutUs.story;
  const paragraphs = s.paragraphs.filter((p) => !p.trimStart().startsWith("—"));
  const signature = s.paragraphs.find((p) => p.trimStart().startsWith("—"));

  return (
    <section className="relative px-6 pb-[120px] pt-[180px] max-[920px]:pb-20 max-[920px]:pt-[120px]">
      <Glow className="left-1/2 top-[20px] h-[760px] w-[1180px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.32),rgba(187,74,35,0.1)_55%,transparent_82%)] max-[920px]:top-[-60px]" />
      <Wrap className="relative">
        <SectionReveal className="mx-auto max-w-[820px] text-center">
          <SubheadingReveal delay={0.4}>
            <Kicker>{s.eyebrow}</Kicker>
          </SubheadingReveal>
          <HeadingReveal
            as="h1"
            className="mt-[26px] font-serif text-[clamp(38px,5vw,60px)] leading-[1.04] tracking-[-0.03em] [font-weight:460]"
          >
            {s.title}
          </HeadingReveal>
        </SectionReveal>
        {/* Paragraphs can carry inline links (withLinks), so they reveal as
           blocks rather than word by word. */}
        <SectionReveal className="mx-auto mt-14 flex max-w-[680px] flex-col gap-5">
          {paragraphs.map((p, i) => (
            <Reveal key={i} delay={0.1 + i * 0.1}>
              <p className="text-[clamp(16px,1.7vw,18px)] leading-[1.7] text-paper/70">
                {withLinks(p)}
              </p>
            </Reveal>
          ))}
          {signature && (
            <Reveal delay={0.1 + paragraphs.length * 0.1} className="mt-2">
              <p className="font-serif text-[20px] italic text-accent-soft">
                {signature}
              </p>
            </Reveal>
          )}
        </SectionReveal>
      </Wrap>
    </section>
  );
}
