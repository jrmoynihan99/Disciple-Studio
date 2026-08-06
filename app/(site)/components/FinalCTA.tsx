import type { ReactNode } from "react";
import Image from "next/image";
import { Btn, Arrow } from "@/components/ui";
import { Glow } from "./ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import MarkerReveal from "@/components/reveal-animations/MarkerReveal";

/* Closing section: big serif ask, CTA pair, then the mini mono footer.
   Reveals cascade when the section scrolls in; the footer stays static.
   `titleEm` is the italic accent second line. */
export default function FinalCTA({
  title,
  titleEm,
  sub,
  demoHref,
  demoLabel = "See a live demo",
  primary,
  links,
}: {
  title: string;
  titleEm?: string;
  sub?: ReactNode;
  demoHref: string;
  demoLabel?: string;
  /* Overrides the "Let's Chat → /book" button — the booking pages point this
     home instead, since sending /book back to itself would be circular. */
  primary?: { href: string; label: ReactNode };
  links: { label: string; href: string }[];
}) {
  return (
    <section className="relative mt-[140px] overflow-hidden border-t border-paper/[0.07] px-6 pb-20 pt-[110px] text-center max-[920px]:mt-24 max-[920px]:pt-16">
      <Glow className="bottom-[-160px] left-1/2 h-[820px] w-[1500px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.26),rgba(187,74,35,0.07)_55%,transparent_78%)]" />
      <SectionReveal className="relative">
        <h2 className="font-serif text-[clamp(38px,5vw,56px)] leading-[1.04] tracking-[-0.028em] [font-weight:460]">
          <HeadingReveal as="span" className="block">
            {title}
          </HeadingReveal>
          {titleEm && (
            <em className="text-accent-soft">
              <MarkerReveal>
                <HeadingReveal as="span" delay={0.15} className="block">
                  {titleEm}
                </HeadingReveal>
              </MarkerReveal>
            </em>
          )}
        </h2>
        {sub &&
          (typeof sub === "string" ? (
            <ParagraphReveal
              delay={0.5}
              className="mx-auto mt-6 max-w-[34em] text-[clamp(16px,1.8vw,18px)] leading-[1.55] text-paper/70"
            >
              {sub}
            </ParagraphReveal>
          ) : (
            <p className="mx-auto mt-6 max-w-[34em] text-[clamp(16px,1.8vw,18px)] leading-[1.55] text-paper/70">
              {sub}
            </p>
          ))}
        <Reveal delay={0.65} className="mt-[34px] flex flex-wrap justify-center gap-3.5">
          <Btn href={primary?.href ?? "/book"}>
            {primary?.label ?? (
              <>
                Let{"’"}s Chat <Arrow />
              </>
            )}
          </Btn>
          <Btn variant="ghostLight" href={demoHref} target="_blank" rel="noreferrer">
            {"▶"} {demoLabel}
          </Btn>
        </Reveal>
        <div className="mt-[90px] flex items-center justify-between border-t border-paper/[0.08] pt-[22px] font-mono text-[11px] text-paper/45 max-[720px]:flex-col max-[720px]:gap-4">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- see Nav: Providers routes internal anchors through next-view-transitions */}
          <a
            href="/"
            className="inline-flex items-center gap-2 text-paper/45 transition-colors hover:text-paper"
          >
            {/* alt="" — the wordmark right beside it already names the link.
                rounded-md matches the tile the accent square used to be. */}
            <Image
              src="/logoFlipped.png"
              alt=""
              width={48}
              height={48}
              className="h-6 w-6 flex-none rounded-md"
            />
            Disciple Studio
          </a>
          <span className="inline-flex gap-5">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-paper/45 transition-colors hover:text-paper"
              >
                {l.label} {"→"}
              </a>
            ))}
          </span>
        </div>
      </SectionReveal>
    </section>
  );
}
