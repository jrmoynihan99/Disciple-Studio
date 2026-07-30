"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useRevealDelay } from "@/lib/transition-timing";
import { useSectionReveal } from "@/context/SectionRevealContext";
import { noop } from "@/lib/noop";

type GlowRevealProps = {
  children: React.ReactNode;
  /* Backdrop glow layer — rendered on its own motion layer so it can
     bloom in brighter on a longer, trailing curve than the frame. */
  glow?: React.ReactNode;
  /* Bloom curve for the glow layer; defaults match the original
     slow trailing fade. */
  glowDuration?: number;
  glowDelay?: number;
  delay?: number;
  className?: string;
  immediate?: boolean;
};

/* Slow fade-and-lift for big framed visuals: the whole block rises in
   while the glow brightens behind it. The glow's own class-based
   opacity (e.g. hover states) still applies — this layer multiplies. */
export default function GlowReveal({
  children,
  glow,
  glowDuration = 2.6,
  glowDelay = 0.3,
  delay = 0,
  className = "",
  immediate = false,
}: GlowRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -60px 0px", amount: 0.2 });
  const section = useSectionReveal();
  const totalDelay = delay + useRevealDelay();
  const ease = [0.08, 0.82, 0.17, 1] as [number, number, number, number];

  const shouldAnimate = immediate || (section ? section.triggered : isInView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 48 }}
      onUpdate={noop}
      transition={{ duration: 1.8, ease, delay: totalDelay }}
      style={{ willChange: "transform, opacity" }}
      className={className}
    >
      {glow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={shouldAnimate ? { opacity: 1 } : { opacity: 0 }}
          onUpdate={noop}
          transition={{
            duration: glowDuration,
            ease: "easeOut",
            delay: totalDelay + glowDelay,
          }}
        >
          {glow}
        </motion.div>
      )}
      {children}
    </motion.div>
  );
}
