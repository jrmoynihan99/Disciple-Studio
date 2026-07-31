"use client";

import { useState } from "react";
import type { IndexRow } from "@/lib/leads/engine/types";
import { PLATE_CLASS, logoPlate } from "@/lib/leads/engine/logo";

/**
 * The logo thumbnail, on one of three plates.
 *
 * THE BACKING IS NOT A STYLE CHOICE, and `logoPlate()` owns the decision — see
 * the reasoning there. In short: white where the pipeline classified the ink and
 * white is safe, a dark plate for cut-outs, and the beige checker ONLY where the
 * polarity is unknown, because that is the one plate that reads both.
 *
 * The failure this guards against is that a white-on-white logo is
 * indistinguishable from a logo we never found — so the tile would silently
 * report missing data that we actually have.
 */
export function LogoTile({ row, size = 54 }: { row: IndexRow; size?: number }) {
  const [failed, setFailed] = useState(false);

  const src =
    row.lo && row.lx ? `/api/leads/asset/logos-thumb/${row.lo}.webp` : null;

  // "No logo found" and "we found one and rejected it" are DIFFERENT FACTS, and
  // the tile says which when we know.
  const reason = row.lr ? row.lr.replace(/_/g, " ") : "";

  if (!src || failed) {
    return (
      <span
        title={reason || "no logo candidate survived"}
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-lg border border-dashed border-lead-line bg-lead-panel2 p-1 text-center text-[9px] leading-tight font-semibold text-lead-ink2"
      >
        {reason || "No Logo Found"}
      </span>
    );
  }

  const plate = PLATE_CLASS[logoPlate(row.lt)];

  return (
    // A plain <img>, not next/image: these are content-addressed thumbs already
    // resized to 108px by the publish, served from our own gated origin with an
    // immutable cache header. next/image would re-optimize a 2.4 KB webp and
    // route it through a loader that cannot see the Basic-auth session.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-lg border border-lead-line object-contain p-[3px] ${plate}`}
    />
  );
}
