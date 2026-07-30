import type { ReactNode } from "react";
import { Btn, Arrow } from "@/components/ui";
import { Glow, Tag } from "./ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";

/* Bordered accent callout band ("If it doesn't exist yet, we build it").
   Content cascades in when the band scrolls into view. Pass `title`/`sub`
   as strings ("\n" for line breaks) for the word-level reveals. */
export default function AccentBand({
  tag,
  title,
  sub,
  ctaLabel = "Let’s Chat",
  ctaHref = "/book",
  subMaxW = "max-w-[26em]",
}: {
  tag: ReactNode;
  title: ReactNode;
  sub: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  subMaxW?: string;
}) {
  const titleClass =
    "mt-4 font-serif text-[clamp(30px,3vw,40px)] leading-[1.06] tracking-[-0.02em] [font-weight:460]";
  const subClass = `mx-auto mt-4 text-[16.5px] leading-[1.55] text-paper/70 ${subMaxW}`;

  return (
    <div className="px-6 pt-[130px] text-center max-[920px]:pt-20">
      <div className="relative mx-auto max-w-[880px] overflow-hidden rounded-3xl border-[1.5px] border-accent/45 bg-accent/[0.08] px-16 py-14 max-[920px]:px-6 max-[920px]:py-10">
        <Glow className="left-1/2 top-[-160px] h-[400px] w-[700px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.22),transparent_75%)]" />
        <SectionReveal className="relative">
          <SubheadingReveal delay={0.4}>
            <Tag>{tag}</Tag>
          </SubheadingReveal>
          {typeof title === "string" ? (
            <HeadingReveal as="h3" className={titleClass}>
              {title}
            </HeadingReveal>
          ) : (
            <h3 className={titleClass}>{title}</h3>
          )}
          {typeof sub === "string" ? (
            <ParagraphReveal delay={0.5} className={subClass}>
              {sub}
            </ParagraphReveal>
          ) : (
            <p className={subClass}>{sub}</p>
          )}
          <Reveal delay={0.65} className="mt-[26px]">
            <Btn href={ctaHref}>
              {ctaLabel} <Arrow />
            </Btn>
          </Reveal>
        </SectionReveal>
      </div>
    </div>
  );
}
