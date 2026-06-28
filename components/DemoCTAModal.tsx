"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { DemoCTAContent } from "./DemoClosingCTA";

/**
 * The popup every placeholder button opens. Same content as the closing footer,
 * but with "This is a demo — " in front of the paragraph, so a click on a fake
 * button gently explains itself and points to the real ask. Closes on backdrop
 * click, the X, or Escape.
 */
export default function DemoCTAModal({
  open,
  onClose,
  bookHref,
  feature,
}: {
  open: boolean;
  onClose: () => void;
  bookHref: string;
  /** Names the clicked feature so the headline reads "{feature} Available in
   *  Full Build"; omitted ⇒ the generic "Want this for your church?" ask. */
  feature?: string;
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
            className="relative my-auto w-full max-w-[480px] rounded-[24px] border border-edge bg-card px-7 py-9 text-center text-ink shadow-[0_40px_90px_-30px_rgba(0,0,0,0.5)]"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1 text-ink-muted transition-colors hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
            <DemoCTAContent bookHref={bookHref} demo feature={feature} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
