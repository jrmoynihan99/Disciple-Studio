import type { ChurchView } from "@/lib/leads/engine/adapt";
import { QSHORT } from "@/lib/leads/engine/labels";
import { PLATFORM_FACETS } from "@/lib/leads/engine/platform";
import { DISPLAY_KEYS, type QuestionKey } from "@/lib/leads/engine/types";
import { facetVal } from "@/lib/leads/engine/filter";

export interface FacetDef {
  key: string;
  name: string;
  /** A platform or a language is a FACT, not a verdict — it gets no swatch. */
  isFact: boolean;
  /** Count-derived colours are shown but are not per-value recolourable. */
  derived: boolean;
}

export type FacetGroupKey = "core" | "appweb" | "rest";

/**
 * Which facets sit in which rail group.
 *
 * q3 appears nowhere: it is retired, and it already had no facet in the
 * reference build (`NO_FACET = new Set(["q1","q3"])`).
 *
 * q1 (Pathway) DOES get one here. It had none before because it rendered
 * nowhere at all; now that it appears in "The rest", "show me churches already
 * thinking in journeys" is a filter a salesperson would actually want.
 */
const GROUP_OF: Record<string, FacetGroupKey> = {
  q2: "core",
  steps: "core",
  q5: "core",
  lang: "core",
  q7: "appweb",
  q7_platform: "appweb",
  q8: "appweb",
  q8_platform: "appweb",
  q1: "rest",
  q4: "rest",
  q6: "rest",
  q9: "rest",
  q10: "rest",
};

export const GROUP_LABEL: Record<FacetGroupKey, string> = {
  core: "core filters",
  appweb: "app & website",
  rest: "the rest",
};

/**
 * Build the facet list from the data.
 *
 * A platform facet only appears when some church actually has a platform key —
 * an empty dropdown offers a filter that means nothing.
 */
export function buildFacets(views: readonly ChurchView[]): FacetDef[] {
  const out: FacetDef[] = [];

  const push = (key: string, name: string, isFact = false, derived = false) => {
    out.push({ key, name, isFact, derived });
  };

  for (const k of DISPLAY_KEYS) {
    const qk = k as QuestionKey;
    push(qk, QSHORT[qk] ?? qk, false, qk === "q2");

    // The paid-staff count facet sits directly after Staff.
    if (qk === "q2") push("steps", "Next steps", false, true);

    const platformKey = PLATFORM_FACETS[qk];
    if (platformKey && views.some((v) => v.q(qk)?.platform_key)) {
      // q7/q8 carry TWO independent facets: the verdict and the platform.
      // "Show me every Wix church" and "show me every clunky site" are
      // different questions, and conflating them was the original bug.
      push(platformKey, `${QSHORT[qk]} platform`, true);
    }
  }

  if (views.some((v) => v.lang)) push("lang", "Language", true);

  return out;
}

export function groupOf(key: string): FacetGroupKey {
  return GROUP_OF[key] ?? "rest";
}

/** Values present for a facet, ordered for the panel. */
export function facetValues(key: string, views: readonly ChurchView[]): string[] {
  const s = new Set<string>();
  for (const v of views) {
    const val = facetVal(key, v);
    if (val) s.add(val);
  }
  const vals = [...s];
  // Count facets sort numerically; everything else alphabetically.
  if (key === "q2" || key === "steps") {
    return vals.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }
  return vals.sort();
}
