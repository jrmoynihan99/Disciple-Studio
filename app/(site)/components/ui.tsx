import type { ReactNode } from "react";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";
import MarkerReveal from "@/components/reveal-animations/MarkerReveal";

/* Bracketed mono section label: [ 01 // The login ] */
export function Kicker({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent-soft ${className}`}
    >
      [ {children} ]
    </span>
  );
}

/* Unbracketed mono feature label: FEATURE — SERMONS */
export function Tag({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-xs font-semibold tracking-[0.12em] text-accent-soft ${className}`}
    >
      {children}
    </span>
  );
}

/* Warm radial glow behind sections. Position and size via className;
   the gradient itself can be overridden there too since later
   arbitrary bg-[...] classes are more specific in practice. */
export function Glow({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute bg-[radial-gradient(closest-side,rgba(187,74,35,0.22),rgba(187,74,35,0.06)_55%,transparent_78%)] ${className}`}
    />
  );
}

/* Centered kicker + serif display heading + optional sub copy.
   With `animate`, pass `title` as a string ("\n" for line breaks) and it
   renders as staggered reveals: heading right away, kicker and sub
   trailing. `titleEm` adds an italic accent second line. */
export function SectionHead({
  kicker,
  title,
  titleEm,
  titleEmMarker = false,
  sub,
  titleClassName = "text-[clamp(34px,4.2vw,54px)]",
  subClassName = "max-w-[33em]",
  className = "",
  animate = false,
}: {
  kicker: ReactNode;
  title: ReactNode;
  titleEm?: string;
  /* Sweep a highlighter stroke under titleEm once its reveal settles */
  titleEmMarker?: boolean;
  sub?: ReactNode;
  titleClassName?: string;
  subClassName?: string;
  className?: string;
  animate?: boolean;
}) {
  const headingClass = `mt-[22px] font-serif leading-[1.04] tracking-[-0.028em] [font-weight:460] ${titleClassName}`;
  const subClass = `mx-auto mt-6 text-[clamp(16px,1.7vw,18px)] leading-[1.55] text-paper/70 ${subClassName}`;

  if (animate) {
    return (
      <div className={`relative text-center ${className}`}>
        <SubheadingReveal delay={0.4}>
          <Kicker>{kicker}</Kicker>
        </SubheadingReveal>
        {typeof title === "string" ? (
          titleEm ? (
            <h2 className={headingClass}>
              <HeadingReveal as="span" className="block">
                {title}
              </HeadingReveal>
              <em className="text-accent-soft">
                {titleEmMarker ? (
                  <MarkerReveal>
                    <HeadingReveal as="span" delay={0.15} className="block">
                      {titleEm}
                    </HeadingReveal>
                  </MarkerReveal>
                ) : (
                  <HeadingReveal as="span" delay={0.15} className="block">
                    {titleEm}
                  </HeadingReveal>
                )}
              </em>
            </h2>
          ) : (
            <HeadingReveal as="h2" className={headingClass}>
              {title}
            </HeadingReveal>
          )
        ) : (
          <h2 className={headingClass}>{title}</h2>
        )}
        {sub &&
          (typeof sub === "string" ? (
            <ParagraphReveal delay={0.5} className={subClass}>
              {sub}
            </ParagraphReveal>
          ) : (
            <p className={subClass}>{sub}</p>
          ))}
      </div>
    );
  }

  return (
    <div className={`relative text-center ${className}`}>
      <Kicker>{kicker}</Kicker>
      <h2 className={headingClass}>{title}</h2>
      {sub && <p className={subClass}>{sub}</p>}
    </div>
  );
}
