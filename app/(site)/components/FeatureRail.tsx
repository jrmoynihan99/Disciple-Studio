"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "@/components/reveal-animations/Reveal";

export type RailItem = { title: string; desc: string };

const EASE = [0.08, 0.82, 0.17, 1] as [number, number, number, number];

/* Panels enter from the side the selection moved toward, so the swap
   reads as one motion with the rail highlight. */
const PANEL_VARIANTS = {
  enter: (dir: number) => ({ opacity: 0, y: 26 * dir, scale: 0.98 }),
  center: { opacity: 1, y: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, y: -26 * dir, scale: 0.98 }),
};

/* Selectable numbered feature list on the left, one live demo panel on
   the right. Panels are passed as server-rendered slots so this client
   component stays thin. With `reveal`, the rail items cascade in and
   the panel trails them (first paint only — switching animates via the
   shared highlight + panel crossfade below). */
export default function FeatureRail({
  items,
  panels,
  reveal = false,
}: {
  items: RailItem[];
  panels: ReactNode[];
  reveal?: boolean;
}) {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const uid = useId();

  const select = (i: number) => {
    if (i === active) return;
    setDir(i > active ? 1 : -1);
    setActive(i);
  };

  const panel = (
    <div className="relative">
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div
          key={active}
          custom={dir}
          variants={PANEL_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.4, ease: EASE }}
        >
          {panels[active]}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return (
    <div className="relative mt-[72px] grid grid-cols-[1fr_1.1fr] items-center gap-[72px] max-[980px]:mt-12 max-[980px]:grid-cols-1 max-[980px]:gap-10">
      <div className="flex flex-col gap-1.5">
        {items.map((it, i) => {
          const on = i === active;
          const button = (
            <motion.button
              key={reveal ? undefined : it.title}
              type="button"
              layout
              transition={{ layout: { duration: 0.45, ease: EASE } }}
              style={{ borderRadius: 18 }}
              onClick={() => select(i)}
              aria-pressed={on}
              className={`relative grid w-full cursor-pointer grid-cols-[44px_1fr] gap-5 px-6 py-[22px] text-left ${
                on ? "" : "hover:bg-paper/[0.04]"
              }`}
            >
              {on && (
                <motion.span
                  layoutId={`${uid}-rail-highlight`}
                  className="absolute inset-0 bg-accent/10"
                  style={{ borderRadius: 18 }}
                  transition={{ duration: 0.45, ease: EASE }}
                />
              )}
              <motion.span
                layout="position"
                className={`relative grid h-9 w-9 place-items-center rounded-full border-[1.5px] font-mono text-[13px] font-semibold transition-colors duration-300 ${
                  on
                    ? "border-transparent bg-accent text-white"
                    : "border-paper/20 text-paper/60"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </motion.span>
              <motion.span layout="position" className="relative min-w-0 self-center">
                <span
                  className={`block font-serif text-[23px] tracking-[-0.01em] transition-colors duration-300 ${
                    on ? "" : "text-paper/65"
                  }`}
                >
                  {it.title}
                </span>
                {on && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35, delay: 0.12, ease: EASE }}
                    className="mt-[5px] block text-[14.5px] leading-[1.5] text-paper/65"
                  >
                    {it.desc}
                  </motion.span>
                )}
              </motion.span>
            </motion.button>
          );
          return reveal ? (
            <Reveal key={it.title} delay={0.1 + i * 0.08}>
              {button}
            </Reveal>
          ) : (
            button
          );
        })}
      </div>
      {reveal ? <Reveal delay={0.3}>{panel}</Reveal> : panel}
    </div>
  );
}
