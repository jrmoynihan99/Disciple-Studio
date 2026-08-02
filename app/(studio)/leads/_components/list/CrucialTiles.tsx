"use client";

import type { ChurchView } from "@/lib/leads/engine/adapt";
import type { EngineCtx, StepCategory, VerdictState } from "@/lib/leads/engine/types";
import type { PathwayKnowledge } from "@/lib/leads/engine/group-types";
import { backendIsKind, backendName } from "@/lib/leads/engine/backend";
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

/**
 * The discipleship tile, in the three states the data actually distinguishes.
 *
 * "None" IS A CLAIM AND MOST CHURCHES HAVE NOT EARNED IT. 627 churches publish
 * an adjudicated pathway. 4,534 were read and publish none — a measured
 * negative, and the only ones this may say "None" about. The remaining 10,113,
 * dominated by the 9,766 our detector never asked about, get "Not checked",
 * because printing "None" over them would assert an absence nobody looked for.
 *
 * This is the same rule the Next-steps tile beside it follows when it refuses to
 * render `0/8` for a church whose next-step pages were never read, and it is the
 * reason `pathwayKnowledge()` is one function shared with the dossier.
 */
const PATHWAY_TILE: Record<
  PathwayKnowledge,
  { state: VerdictState; title: string }
> = {
  has: { state: "good", title: "The church publishes a named discipleship pathway" },
  none: {
    state: "bad",
    title: "We read the site and it publishes no discipleship pathway",
  },
  unknown: {
    state: "unk",
    title: "We did not check this church for a discipleship pathway",
  },
};

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

  // The ChMS name, or "" — `backendIsKind` is the same test the ChMS facet and
  // the favor point use, so the tile, the filter and the score never disagree
  // about whether a church runs one.
  const chms = backendIsKind(view.backend, "chms") ? backendName(view.backend) : "";

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
          {/* An answer we have no short form for is as unmeasured, to a reader,
              as one we never got — so it reads the same rather than as a dash. */}
          {LOGIN_SHORT[q5?.answer ?? "unknown"] ?? "Unknown"}
        </span>
      </Tile>

      {/* ── ChMS ──
          The platform line under the church's name already contains this, but
          buried: "WordPress · Church Center" gives no clue which of the two is
          the site builder and which is the management system, and it says
          nothing at all for the 1,359 churches where we detected neither.

          "NOT DETECTED", NOT "NONE". Detection is single-valued — a church on
          Breeze that also runs Givelify may surface only Givelify — so the
          absence of a ChMS here is a fact about our scrape, not about the
          church, and the tile has to say the one it can stand behind. It is grey
          for the same reason. */}
      <Tile
        state={chms ? "good" : "unk"}
        label="ChMS"
        title={
          chms
            ? `Runs ${chms}`
            : "No church management system was detected — not proof there is none"
        }
      >
        <span className="text-xs font-bold text-lead-ink">{chms || "Not detected"}</span>
      </Tile>

      <Tile
        state={PATHWAY_TILE[view.pathway].state}
        label="Discipleship"
        title={PATHWAY_TILE[view.pathway].title}
      >
        <span className="text-xs font-bold text-lead-ink">
          {view.pathway === "has"
            ? `${view.pathwaySteps} step${view.pathwaySteps === 1 ? "" : "s"}`
            : view.pathway === "none"
              ? "None"
              : "Not checked"}
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
