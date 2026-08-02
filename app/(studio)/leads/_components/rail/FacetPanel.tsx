"use client";

import { useState } from "react";
import type { ChurchView } from "@/lib/leads/engine/adapt";
import type { EngineCtx, VerdictState } from "@/lib/leads/engine/types";
import { VALID_STATES } from "@/lib/leads/engine/types";
import { answerLabel, VERDICT_WORD } from "@/lib/leads/engine/labels";
import { facetCounts, optionState } from "@/lib/leads/engine/filter";
import { fillClass } from "../verdict";
import { Chevron } from "../Chevron";
import { facetValues, facetValueLabel, type FacetDef } from "./facets";

/**
 * One facet: a collapsed bar showing its name and the current selection, and on
 * open, one row per answer value — checkbox, colour swatch, human label, live
 * count.
 *
 * CLICKING THE SWATCH (not the row) opens the palette. Picking a state
 * recolours that (question, answer) pair EVERYWHERE at once — cells, chips,
 * tiles, the dossier and the histogram — because the override is consulted
 * before every built-in rule.
 */
export function FacetPanel({
  facet,
  views,
  allViews,
  ctx,
  selected,
  onToggleValue,
  onRecolour,
}: {
  facet: FacetDef;
  /** Narrowed by every OTHER filter, so counts update as the set narrows. */
  views: readonly ChurchView[];
  /** The full corpus, for deciding an option's dominant colour. */
  allViews: readonly ChurchView[];
  ctx: EngineCtx;
  selected: string[];
  onToggleValue: (value: string) => void;
  onRecolour: (answer: string, state: VerdictState | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState<string | null>(null);

  const values = facetValues(facet.key, allViews);
  const counts = facetCounts(facet.key, views);
  const active = selected.length > 0;

  if (!values.length) return null;

  return (
    <div
      className={`mb-1.5 overflow-hidden rounded-lg border bg-lead-panel transition-colors ${
        active ? "border-lead-brand" : "border-lead-line"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs text-lead-ink"
      >
        <span className="min-w-0 flex-1 truncate">{facet.name}</span>
        <span
          className={`shrink-0 font-mono text-[10.5px] ${active ? "text-lead-brand" : "text-lead-ink2"}`}
        >
          {active ? `${selected.length} selected` : "any"}
        </span>
        <Chevron open={open} className="text-lead-ink2" />
      </button>

      {open && (
        <div className="max-h-64 overflow-y-auto px-1.5 pb-2">
          {values.map((v) => {
            const { state, mixed } = optionState(facet.key, v, allViews, ctx);
            const on = selected.includes(v);
            // `facetValueLabel` owns the per-facet wording; a fact with no
            // entry there shows its raw value, and everything else is an answer.
            const label =
              facetValueLabel(facet.key, v) || (facet.isFact ? v : answerLabel(facet.key, v));

            return (
              <div key={v} className="relative">
                <label
                  className={`flex cursor-pointer items-center gap-[7px] rounded-md p-1 text-xs hover:bg-lead-bg ${
                    on ? "bg-lead-brand/10" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggleValue(v)}
                    className="shrink-0"
                  />

                  {facet.isFact ? (
                    // A platform or a language is a fact, not a verdict. No
                    // swatch — there is nothing to recolour.
                    <span className="size-[13px] shrink-0 rounded border border-dashed border-lead-line" />
                  ) : (
                    <button
                      type="button"
                      title={
                        facet.derived
                          ? "colour is derived from the count — not recolourable"
                          : `recolour: currently ${VERDICT_WORD[state as VerdictState] ?? "—"}`
                      }
                      disabled={facet.derived}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPalette(palette === v ? null : v);
                      }}
                      className={`size-[13px] shrink-0 rounded border border-transparent ${
                        state ? fillClass(state as VerdictState) : "bg-lead-unk"
                      } ${facet.derived ? "cursor-default" : "cursor-pointer hover:ring-2 hover:ring-lead-brand"}`}
                    />
                  )}

                  <span className="min-w-0 flex-1 truncate text-lead-ink">
                    {label}
                    {/* Options whose colour varies church-to-church are marked
                        `~`: two churches with the same answer can render
                        different colours where the colour is computed. */}
                    {mixed && <i className="ml-1 font-mono text-lead-ink2 not-italic">~</i>}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-lead-ink2">
                    {counts.get(v) ?? 0}
                  </span>
                </label>

                {palette === v && (
                  <div className="absolute right-1 z-30 mt-0.5 flex items-center gap-1.5 rounded-lg border border-lead-line bg-lead-panel px-2 py-1.5 shadow-lg">
                    {VALID_STATES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        title={VERDICT_WORD[s as VerdictState]}
                        onClick={() => {
                          onRecolour(v, s as VerdictState);
                          setPalette(null);
                        }}
                        className={`size-[17px] rounded border border-transparent hover:ring-2 hover:ring-lead-brand ${fillClass(s as VerdictState)}`}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        onRecolour(v, null);
                        setPalette(null);
                      }}
                      className="rounded border border-lead-line px-1.5 py-0.5 font-mono text-[10px] text-lead-ink2 hover:text-lead-ink"
                    >
                      reset
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
