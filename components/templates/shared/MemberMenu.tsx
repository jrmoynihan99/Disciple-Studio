"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChurchConfig } from "@/lib/types";
import { getMemberProgress, type StepItem } from "@/lib/steps";
import { useClickOutside } from "@/lib/useClickOutside";
import { EASE, SPRING_SOFT } from "@/lib/motion";
import { useDemoCTA } from "@/context/DemoCTAContext";

/**
 * The self-chrome member control shared by the newer templates (Stream, Console,
 * Orbit): an avatar/name trigger that opens a dropdown showing the member's next
 * step, both progress lists, and a "View profile" nudge to the CTA.
 *
 * The three original templates inline their own bespoke version; these newer
 * designs reuse this one so the menu stays consistent while each template styles
 * only its trigger (via `triggerClassName`). All colors come from the injected
 * palette tokens, so it adapts to light/dark like everything else.
 */

function currentOf(steps: StepItem[]): StepItem | undefined {
  return steps.find((s) => s.inProgress) ?? steps.find((s) => !s.completed) ?? steps[0];
}

export default function MemberMenu({
  config,
  triggerClassName,
  align = "right",
  placement = "down",
}: {
  config: ChurchConfig;
  /** Override the trigger button's classes to match the host template. */
  triggerClassName?: string;
  /** Which edge the dropdown anchors to. */
  align?: "left" | "right";
  /** Open below the trigger ("down") or above it ("up", e.g. a bottom-pinned
   *  control in a sidebar). */
  placement?: "up" | "down";
}) {
  const openCTA = useDemoCTA();
  const firstName = config.demoMember.firstName;
  const { discipleshipSteps, nextSteps } = getMemberProgress(config);
  const lists = [{ label: "Discipleship track", steps: discipleshipSteps }];
  if (nextSteps.length) lists.push({ label: "Next steps", steps: nextSteps });
  const current = currentOf(discipleshipSteps);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));

  const up = placement === "up";
  const verticalClass = up ? "bottom-[calc(100%+10px)]" : "top-[calc(100%+10px)]";
  const originClass = `${up ? "origin-bottom" : "origin-top"}-${align === "right" ? "right" : "left"}`;
  const offY = up ? 6 : -6;

  return (
    <div ref={ref} className="relative shrink-0">
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={SPRING_SOFT}
        className={
          triggerClassName ??
          "flex cursor-pointer items-center gap-2.5 rounded-full border border-edge bg-card py-1.5 pl-[13px] pr-2"
        }
      >
        <div className="text-[13px] font-bold">{firstName}</div>
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-edge bg-card-2 text-[13px] font-bold text-ink-soft">
          {firstName.charAt(0)}
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: offY, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: offY, scale: 0.97 }}
            transition={{ duration: 0.2, ease: EASE }}
            className={`absolute z-50 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[18px] border border-edge bg-card shadow-[0_30px_64px_-26px_rgba(20,12,6,0.4)] ${verticalClass} ${
              align === "right" ? "right-0" : "left-0"
            } ${originClass}`}
          >
            <div className="bg-card-2 px-5 pb-[15px] pt-[18px]">
              <div className="text-[9.5px] font-extrabold tracking-[2.2px] text-brand">YOUR NEXT STEP</div>
              <div className="mt-[5px] font-serif text-[22px] leading-[1.12]">{current?.label ?? ""}</div>
            </div>
            <div className="h-px bg-hairline-soft" />
            <div className="px-5 pb-1.5 pt-[14px]">
              {lists.map((list) => {
                const ld = list.steps.filter((s) => s.completed).length;
                return (
                  <div key={list.label} className="mb-3">
                    <div className="text-[9.5px] font-bold uppercase tracking-[1.8px] text-faint">
                      {list.label} · {ld}/{list.steps.length}
                    </div>
                    <div className="mt-2.5 flex flex-col gap-2">
                      {list.steps.map((s) => (
                        <div key={s.key} className="flex items-center gap-[9px]">
                          {s.completed ? (
                            <div className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-brand">
                              <span className="text-[8px] leading-none text-on-accent">✓</span>
                            </div>
                          ) : s.inProgress ? (
                            <div className="h-4 w-4 flex-none rounded-full border-2 border-brand bg-card" />
                          ) : (
                            <div className="h-4 w-4 flex-none rounded-full border-2 border-upcoming bg-card" />
                          )}
                          <div
                            className={`text-[13px] ${s.inProgress ? "font-bold" : "font-medium"} ${
                              s.completed || s.inProgress ? "text-ink-soft" : "text-faint"
                            }`}
                          >
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="h-px bg-hairline-soft" />
            <div className="px-[15px] py-3">
              <motion.button
                onClick={() => {
                  setOpen(false);
                  openCTA();
                }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING_SOFT}
                className="w-full cursor-pointer rounded-[10px] bg-ink py-[11px] text-[13px] font-bold text-paper"
              >
                View profile
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
