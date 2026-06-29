"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { DATA } from "@/app/data";

/**
 * The "how does this work?" explainer, opened from the demo bar's info control.
 * Makes the placeholder data legible: it's sample data now, but on a real build
 * every member's own data syncs in live from the church's existing systems — and
 * a sliding ticker of those systems (the same list as the marketing home) shows
 * which. Closes on backdrop click, the X, or Escape. Styled with the injected
 * demo palette tokens so it matches whichever template is showing.
 */
export default function DemoInfoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative my-auto w-full max-w-[480px] overflow-hidden rounded-[24px] border border-edge bg-card px-7 py-9 text-center text-ink shadow-[0_40px_90px_-30px_rgba(0,0,0,0.5)]"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1 text-ink-muted transition-colors hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
              About this demo
            </span>
            <h2 className="mt-3 font-serif text-[clamp(24px,4.2vw,34px)] leading-[1.12]">
              How this demo works
            </h2>
            <p className="mx-auto mt-4 max-w-[34em] text-[15px] leading-[1.6] text-ink-soft">
              Everything here is sample data — the members, steps, groups, and giving
              are placeholders. On your real build, all of it syncs live from your own
              systems, so every member signs in and sees their journey, their next
              step, their giving.
            </p>

            {/* Sliding ticker of the systems we sync with — same list as the home page. */}
            <div className="mt-7">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
                Syncs with the tools you already use
              </div>
              <div className="relative -mx-7 mt-3 overflow-hidden border-y border-edge bg-card-2/50 py-3 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
                <motion.div
                  className="flex w-max"
                  animate={{ x: ["0%", "-50%"] }}
                  transition={{ duration: 28, ease: "linear", repeat: Infinity }}
                >
                  {[0, 1].map((r) => (
                    <div key={r} className="flex shrink-0" aria-hidden={r === 1}>
                      {DATA.backends.map((b) => (
                        <span
                          key={b}
                          className="flex items-center gap-3 whitespace-nowrap px-4 text-[13px] font-medium text-ink-soft"
                        >
                          {b}
                          <span className="text-brand/45">✦</span>
                        </span>
                      ))}
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
