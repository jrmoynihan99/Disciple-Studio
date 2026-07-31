"use client";

import type { ChurchView } from "@/lib/leads/engine/adapt";
import type { EngineCtx, StepCategory, VerdictState } from "@/lib/leads/engine/types";
import { colorState } from "@/lib/leads/engine/color";
import { staffText } from "@/lib/leads/engine/staff";
import { stepsSummaryState } from "@/lib/leads/engine/steps";
import { LOGIN_SHORT } from "@/lib/leads/engine/labels";
import { fillClass } from "../verdict";

/** The crucial fields, checked with the highest scrutiny, on every row. */

function Tile({
  state,
  label,
  children,
  wide,
  title,
}: {
  state: VerdictState;
  label: string;
  children: React.ReactNode;
  wide?: boolean;
  title?: string;
}) {
  return (
    <div
      title={title}
      className={`relative flex min-w-[70px] flex-col gap-px overflow-hidden rounded-lg border border-lead-line bg-lead-panel2 py-1 pr-2 pl-2.5 ${
        wide ? "basis-full" : ""
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${fillClass(state)}`} />
      <span className="text-[9px] font-bold tracking-wide whitespace-nowrap text-lead-ink2 uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function dotState(s: StepCategory["state"]): VerdictState {
  return s === "present" ? "good" : s === "absent_looked" ? "bad" : "unk";
}

function dotTitle(c: StepCategory): string {
  if (c.state === "present") {
    const terms = (c.own_terms ?? []).join(", ");
    return `${c.label}: offered — ${terms || "named"}`;
  }
  if (c.state === "absent_looked") return `${c.label}: not mentioned on the pages we read`;
  return `${c.label}: next-step pages not read`;
}

export function CrucialTiles({ view, ctx }: { view: ChurchView; ctx: EngineCtx }) {
  const q2 = view.q("q2");
  const q5 = view.q("q5");
  const q7 = view.q("q7");
  const q8 = view.q("q8");

  const steps = view.steps;
  const stepsState = stepsSummaryState(steps);

  // Silent gap tiles: shown ONLY when the church LACKS the thing (an
  // opportunity), absent otherwise.
  const noCustomSite = q7?.answer === "cc_default";
  const noCustomApp = q8?.answer === "no_app" || q8?.answer === "no_app_found";

  return (
    <div
      className="flex flex-wrap content-start gap-1.5"
      title="the crucial fields checked with the highest scrutiny"
    >
      <Tile state={colorState("q2", q2, ctx)} label="Paid staff">
        <span className="text-[15px] leading-tight font-bold text-lead-ink">
          {staffText(q2)}
        </span>
      </Tile>

      <Tile state={colorState("q5", q5, ctx)} label="Custom login">
        <span className="text-xs font-bold text-lead-ink">
          {LOGIN_SHORT[q5?.answer ?? "unknown"] ?? "—"}
        </span>
      </Tile>

      {noCustomSite && (
        <Tile state="good" label="Website">
          <span className="text-xs font-bold text-lead-ink">Not Custom</span>
        </Tile>
      )}
      {noCustomApp && (
        <Tile state="good" label="App">
          <span className="text-xs font-bold text-lead-ink">None</span>
        </Tile>
      )}

      <Tile state={stepsState} label="Next steps" wide>
        {/* `looked: false` reads "not checked", NEVER "0 of 8". Eight grey dots
            and a zero are identical to a hurried reader, and the difference is
            the difference between a fact about the church and a gap in our
            data. */}
        {!steps.looked ? (
          <p className="mt-0.5 text-[11px] italic text-lead-ink2">
            Next-step pages were not read.
          </p>
        ) : (
          <>
            <span className="font-serif text-[15px] leading-none font-bold text-lead-ink">
              {steps.nPresent}/{steps.nCats}
            </span>
            {/* Two columns, eight rows, FIXED English labels — the church's own
                wording lives in the tooltip and the dossier. */}
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
              {steps.cats.map((c) => (
                <div
                  key={c.key}
                  title={dotTitle(c)}
                  className="flex min-w-0 items-center gap-1.5 text-[11px] text-lead-ink"
                >
                  <i
                    className={`inline-block size-2.5 shrink-0 rounded-[3px] ${fillClass(dotState(c.state))}`}
                  />
                  <span className="truncate">{c.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Tile>
    </div>
  );
}
