"use client";

import { motion } from "framer-motion";
import { useRevealDelay } from "@/lib/transition-timing";
import { useSectionReveal } from "@/context/SectionRevealContext";
import { noop } from "@/lib/noop";

type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  immediate?: boolean;
};

export default function Reveal({ children, delay = 0, className = "", immediate = false }: RevealProps) {
  const ease = [0.08, 0.82, 0.17, 1] as [number, number, number, number];
  const totalDelay = delay + useRevealDelay();
  const section = useSectionReveal();

  const animationProps = immediate || (section && section.triggered)
    ? {
        initial: { opacity: 0, y: 32 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 1.2, ease, delay: totalDelay },
      }
    : section
      ? {
          initial: { opacity: 0, y: 32 },
          animate: { opacity: 0, y: 32 },
          transition: { duration: 1.2, ease, delay: totalDelay },
        }
      : {
          initial: { opacity: 0, y: 32 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "0px 0px -60px 0px", amount: 0.3 },
          transition: { duration: 1.2, ease, delay: totalDelay },
        };

  return (
    <motion.div
      {...animationProps}
      onUpdate={noop}
      style={{ willChange: "transform, opacity" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
