"use client";

import { Footprints, ChevronRight, CheckCircle2 } from "lucide-react";
import type { StepItem } from "@/lib/steps";

/**
 * The personalized "YOUR NEXT STEP" card — ported from the real product. Shows
 * the member's single next action (or an all-caught-up state). Presentational:
 * the caller computes `nextStep`. Uses the church brand accent (--brand).
 *
 *  - `full`    — page banner
 *  - `compact` — the member dropdown (narrow)
 */
export default function NextStepCard({
  nextStep,
  totalCount,
  variant = "full",
  onNavigate,
}: {
  nextStep: StepItem | null;
  totalCount: number;
  variant?: "full" | "compact";
  onNavigate?: () => void;
}) {
  if (totalCount === 0) return null;

  const compact = variant === "compact";
  const labelText = compact ? "text-sm" : "text-lg";
  const shellClass = `block ${compact ? "rounded-xl p-3" : "rounded-2xl p-5"}`;
  // Brand-tinted shell via inline styles so it follows each church's accent.
  const shellStyle: React.CSSProperties = {
    border: "1px solid rgb(var(--brand) / 0.25)",
    backgroundColor: "rgb(var(--brand) / 0.1)",
  };

  if (!nextStep) {
    return (
      <div className={shellClass} style={shellStyle}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-brand" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
            All steps complete
          </p>
        </div>
        <p className={`mt-1 font-semibold text-fg ${labelText}`}>
          You&apos;re all caught up 🎉
        </p>
      </div>
    );
  }

  const inner = (
    <>
      <div className="flex items-center gap-2">
        <Footprints className="h-4 w-4 text-brand" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
          Your next step
        </p>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className={`font-semibold text-fg ${labelText}`}>{nextStep.label}</p>
        <ChevronRight
          className={`shrink-0 text-fg-muted ${compact ? "h-4 w-4" : "h-5 w-5"}`}
        />
      </div>
    </>
  );

  if (nextStep.href) {
    return (
      <a
        href={nextStep.href}
        onClick={onNavigate}
        className={`${shellClass} transition-colors`}
        style={shellStyle}
      >
        {inner}
      </a>
    );
  }

  return (
    <div className={shellClass} style={shellStyle}>
      {inner}
    </div>
  );
}
