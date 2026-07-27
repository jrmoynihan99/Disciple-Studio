"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useRevealDelay } from "@/lib/transition-timing";
import { useSectionReveal } from "@/context/SectionRevealContext";
import { noop } from "@/lib/noop";

type MarkerRevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  immediate?: boolean;
};

/* Highlighter sweep behind accent text: a translucent marker stroke that
   sweeps left → right. Default delay lands just after a HeadingReveal on
   the same trigger has visually settled — wrap this around the heading's
   accent line. */
export default function MarkerReveal({
  children,
  delay = 1.05,
  className = "",
  immediate = false,
}: MarkerRevealProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -60px 0px", amount: 0.3 });
  const section = useSectionReveal();
  const totalDelay = delay + useRevealDelay();

  const shouldAnimate = immediate || (section ? section.triggered : isInView);

  return (
    <span ref={ref} className={`relative inline-block ${className}`}>
      {children}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -bottom-[0.04em] -left-[0.15em] -right-[0.2em] h-[0.7em] origin-left -rotate-[1.5deg] skew-x-[-3deg] bg-accent/20"
        initial={{ scaleX: 0 }}
        animate={shouldAnimate ? { scaleX: 1 } : { scaleX: 0 }}
        onUpdate={noop}
        transition={{ duration: 0.7, delay: totalDelay, ease: [0.22, 1, 0.36, 1] }}
        style={{ willChange: "transform" }}
      />
    </span>
  );
}
