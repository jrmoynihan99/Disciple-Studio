import type { ReactNode } from "react";
import { Tag } from "./ui";
import { Btn, Arrow } from "@/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";

/* Alternating feature row: floating visual on one side, copy on the
   other. On mobile everything stacks with the copy first. With
   `reveal`, the row becomes its own SectionReveal group — title first,
   then visual, tag, desc, points, and link trailing. Pass `title`/`desc`
   as strings for the word-level reveals. `points` adds a checklist —
   desktop only, since on a phone it pushes the visual too far down —
   `num` a giant ghosted number behind the copy, and `buttonCta` renders
   the link as a primary button instead of a text link. */
export default function FeatureRow({
  tag,
  title,
  desc,
  visual,
  side = "left",
  className = "",
  link,
  reveal = false,
  points,
  num,
  buttonCta = false,
}: {
  tag: ReactNode;
  title: ReactNode;
  desc: ReactNode;
  visual: ReactNode;
  side?: "left" | "right";
  className?: string;
  link?: { label: string; href: string };
  reveal?: boolean;
  points?: string[];
  num?: string;
  buttonCta?: boolean;
}) {
  const titleClass =
    "mt-3.5 font-serif text-[clamp(32px,2.5vw,36px)] leading-[1.08] tracking-[-0.02em] [font-weight:460] max-[980px]:mx-auto max-[980px]:max-w-none";
  const descClass =
    "mt-3.5 max-w-[21em] text-base leading-[1.55] text-paper/60 max-[980px]:mx-auto";
  const ctaDelay = points ? 0.75 : 0.6;

  const linkEl =
    link &&
    (buttonCta ? (
      <Btn
        href={link.href}
        {...(link.href.startsWith("http")
          ? { target: "_blank", rel: "noreferrer" }
          : {})}
      >
        {link.label} <Arrow />
      </Btn>
    ) : (
      <a
        href={link.href}
        {...(link.href.startsWith("http")
          ? { target: "_blank", rel: "noreferrer" }
          : {})}
        className="inline-flex items-center gap-2 text-[15px] font-semibold text-accent-soft transition-colors hover:text-accent-glow"
      >
        {link.label} <span>{link.href.startsWith("http") ? "↗" : "→"}</span>
      </a>
    ));

  /* Oversized and tucked in behind the copy block — the tag, title,
     desc, and checklist overlay most of it. */
  const ghostNum = num && (
    <span
      aria-hidden
      className="pointer-events-none absolute -top-[100px] right-6 select-none font-serif text-[280px] leading-[0.8] tracking-[-0.04em] text-paper/[0.06] max-[980px]:hidden"
    >
      {num}
    </span>
  );

  const pointRow = (p: string) => (
    <span className="flex items-start gap-[11px] max-[980px]:justify-center">
      <span className="mt-[1px] grid h-[19px] w-[19px] flex-none place-items-center rounded-full bg-accent/[0.15] text-[9.5px] text-accent-soft">
        {"✓"}
      </span>
      <span className="text-[14.5px] font-medium leading-[1.45] text-paper/75">
        {p}
      </span>
    </span>
  );

  const text = (
    /* Fixed-width block centered in its grid column, so the copy sits
       in the middle of its half instead of hugging the column edge. */
    <div className="relative mx-auto w-full max-w-[380px] max-[980px]:order-first max-[980px]:max-w-none max-[980px]:px-5 max-[980px]:text-center">
      {ghostNum &&
        (reveal ? <Reveal delay={0.25}>{ghostNum}</Reveal> : ghostNum)}
      {reveal ? (
        <SubheadingReveal delay={0.4}>
          <Tag>{tag}</Tag>
        </SubheadingReveal>
      ) : (
        <Tag>{tag}</Tag>
      )}
      {reveal && typeof title === "string" ? (
        <HeadingReveal as="h3" className={titleClass}>
          {title}
        </HeadingReveal>
      ) : (
        <h3 className={titleClass}>{title}</h3>
      )}
      {reveal && typeof desc === "string" ? (
        <ParagraphReveal delay={0.5} className={descClass}>
          {desc}
        </ParagraphReveal>
      ) : (
        <p className={descClass}>{desc}</p>
      )}
      {points && (
        <div className="mt-6 flex flex-col gap-2.5 max-[980px]:hidden">
          {points.map((p, i) =>
            reveal ? (
              <Reveal key={p} delay={0.55 + i * 0.08}>
                {pointRow(p)}
              </Reveal>
            ) : (
              <span key={p} className="contents">
                {pointRow(p)}
              </span>
            ),
          )}
        </div>
      )}
      {linkEl &&
        (reveal ? (
          <Reveal delay={ctaDelay} className={buttonCta ? "mt-7" : "mt-5"}>
            {linkEl}
          </Reveal>
        ) : (
          <div className={buttonCta ? "mt-7" : "mt-5"}>{linkEl}</div>
        ))}
    </div>
  );

  const visualEl = reveal ? (
    <Reveal delay={0.15} className="min-w-0">
      {visual}
    </Reveal>
  ) : (
    <div className="min-w-0">{visual}</div>
  );

  const gridClass =
    side === "left"
      ? `mx-auto grid max-w-[1440px] grid-cols-[1.2fr_0.8fr] items-center gap-12 pr-24 max-[980px]:grid-cols-1 max-[980px]:gap-8 max-[980px]:pr-0 ${className}`
      : `mx-auto grid max-w-[1440px] grid-cols-[0.8fr_1.2fr] items-center gap-12 pl-24 max-[980px]:grid-cols-1 max-[980px]:gap-8 max-[980px]:pl-0 ${className}`;

  const row =
    side === "left" ? (
      <>
        {visualEl}
        {text}
      </>
    ) : (
      <>
        {text}
        {visualEl}
      </>
    );

  return reveal ? (
    <SectionReveal className={gridClass}>{row}</SectionReveal>
  ) : (
    <div className={gridClass}>{row}</div>
  );
}
