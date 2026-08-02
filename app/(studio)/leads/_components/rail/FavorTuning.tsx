"use client";

import type { EngineCtx, FavorModel, StaffTier } from "@/lib/leads/engine/types";
import type { LeadFilters } from "@/lib/leads/engine/filter";
import {
  defaultFavorModel,
  favFmt,
  favorBase,
  favorMax,
  STEP_CATS,
} from "@/lib/leads/engine/favor";

/**
 * The favor tuning panel.
 *
 * Every input here is a knob the USER turns, which is the whole reason the
 * pipeline is allowed to ship a score at all: favor is the user's own model
 * applied in their browser, never a verdict the pipeline reached. The pipeline
 * records facts and citations; the human predicts fit.
 *
 * Every edit re-scores, re-sorts and redraws the histogram immediately.
 */
function Row({
  label,
  value,
  onChange,
  step = 0.25,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label className="min-w-0 flex-1 text-[11.5px] text-lead-ink2">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value || 0)}
        className="w-[72px] shrink-0 rounded-md border border-lead-line bg-lead-panel px-2 py-1 text-center text-xs text-lead-ink"
      />
    </div>
  );
}

export function FavorTuning({
  ctx,
  filters,
  setFilters,
  onFavorChange,
}: {
  ctx: EngineCtx;
  filters: LeadFilters;
  setFilters: (patch: Partial<LeadFilters>) => void;
  onFavorChange: (favor: FavorModel | null) => void;
}) {
  const favor = ctx.favor;

  const patch = (p: Partial<FavorModel>) => onFavorChange({ ...favor, ...p });

  const setTier = (i: number, t: Partial<StaffTier>) => {
    const tiers = favor.staffTiers.map((x, j) => (j === i ? { ...x, ...t } : x));
    patch({ staffTiers: tiers });
  };

  return (
    <details className="mt-4 rounded-lg border border-lead-line bg-lead-panel p-2.5">
      <summary className="cursor-pointer font-mono text-[10px] font-bold tracking-widest text-lead-ink2 uppercase">
        Favor tuning
      </summary>

      <div className="mt-3">
        <label className="flex cursor-pointer items-center gap-2 pb-2 text-xs text-lead-ink2">
          <input
            type="checkbox"
            checked={filters.opponly}
            onChange={(e) => setFilters({ opponly: e.target.checked })}
          />
          Opportunities only
        </label>

        <p className="mb-1.5 font-mono text-[9px] tracking-wide text-lead-ink2 uppercase">
          Paid-staff size tiers
        </p>
        {/* NON-MONOTONIC ON PURPOSE: mid-size churches earn the most, tiny and
            mega churches earn nothing. Iterate whatever is in the model — the
            user can add and remove tiers, so never assume five. */}
        {favor.staffTiers.map((t, i) => (
          <div key={i} className="mb-1 flex items-center gap-1">
            <input
              type="number"
              value={t.lo}
              onChange={(e) => setTier(i, { lo: +e.target.value || 0 })}
              className="w-[42px] shrink-0 rounded border border-lead-line bg-lead-bg px-1 py-1 text-center text-[11px] text-lead-ink"
            />
            <span className="text-[11px] text-lead-ink2">–</span>
            <input
              type="number"
              placeholder="∞"
              value={t.hi ?? ""}
              onChange={(e) => setTier(i, { hi: e.target.value === "" ? null : +e.target.value })}
              className="w-[42px] shrink-0 rounded border border-lead-line bg-lead-bg px-1 py-1 text-center text-[11px] text-lead-ink"
            />
            <input
              type="number"
              step={0.5}
              value={t.pts}
              onChange={(e) => setTier(i, { pts: +e.target.value || 0 })}
              className="ml-auto w-[42px] shrink-0 rounded border border-lead-line bg-lead-bg px-1 py-1 text-center text-[11px] text-lead-ink"
            />
            <button
              type="button"
              title="remove tier"
              onClick={() =>
                patch({ staffTiers: favor.staffTiers.filter((_, j) => j !== i) })
              }
              className="px-0.5 text-[15px] leading-none text-lead-ink2 hover:text-lead-bad"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            patch({ staffTiers: [...favor.staffTiers, { lo: 0, hi: null, pts: 0 }] })
          }
          className="mb-2 w-full rounded-md border border-dashed border-lead-line py-1 font-mono text-[10.5px] text-lead-ink2 hover:border-lead-brand hover:text-lead-brand"
        >
          + add tier
        </button>

        <Row label="Custom login" value={favor.loginPts} onChange={(n) => patch({ loginPts: n })} />
        <Row
          label="Independent website"
          value={favor.websitePts}
          onChange={(n) => patch({ websitePts: n })}
        />
        <Row label="Native app" value={favor.appPts} onChange={(n) => patch({ appPts: n })} />
        {/* ONE KNOB, NOT ONE PER STEP. The signal is "this church already thinks
            in journeys", which a church either does or does not — a ten-stage
            pathway is not five times the lead of a two-stage one, and points per
            step would make the score move whenever the scraper found more of the
            same page. Churches we never checked score the same zero as churches
            with no pathway: the colour tells those apart, the score must not
            guess. */}
        <Row
          label="Has a discipleship pathway"
          value={favor.pathwayPts ?? 0}
          onChange={(n) => patch({ pathwayPts: n })}
        />
        {/* ChMS ONLY, never the giving processors and media libraries in the
            "other tooling" facet. Running Breeze means a church has bought a
            system it administers and trains staff on; running Givelify means it
            has a card reader. Only the first says anything about appetite. */}
        <Row
          label="Runs a ChMS"
          value={favor.chmsPts ?? 0}
          onChange={(n) => patch({ chmsPts: n })}
        />

        <p className="mt-2 mb-1.5 font-mono text-[9px] tracking-wide text-lead-ink2 uppercase">
          Points per next step
        </p>
        {STEP_CATS.map(([k, label]) => (
          <Row
            key={k}
            label={label}
            step={0.0625}
            value={favor.stepCat[k] ?? 0}
            onChange={(n) => patch({ stepCat: { ...favor.stepCat, [k]: n } })}
          />
        ))}

        {/* Both denominators are recomputed from the live parameters. favorBase
            is the reference shown in the chip — the most a church can score
            WITHOUT the website and app opportunities — so a church can
            legitimately score ABOVE it. That is not a bug and must not be
            clamped. */}
        <p className="mt-2 font-mono text-[10.5px] text-lead-ink2">
          baseline <b className="text-xs text-lead-ink">{favFmt(favorBase(favor))}</b> · ceiling{" "}
          <b className="text-xs text-lead-ink">{favFmt(favorMax(favor))}</b>
        </p>
        <button
          type="button"
          onClick={() => onFavorChange(defaultFavorModel())}
          className="mt-1.5 w-full rounded-md border border-lead-line py-1 font-mono text-[10.5px] text-lead-ink2 hover:text-lead-ink"
        >
          reset to defaults
        </button>
      </div>
    </details>
  );
}
