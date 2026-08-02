import type { ChurchView } from "@/lib/leads/engine/adapt";
import { QSHORT } from "@/lib/leads/engine/labels";
import { PLATFORM_FACETS } from "@/lib/leads/engine/platform";
import { DISPLAY_KEYS, type QuestionKey } from "@/lib/leads/engine/types";
import { facetVal } from "@/lib/leads/engine/filter";
import { backendIsKind, backendName } from "@/lib/leads/engine/backend";
import { PATHWAY_FACET_LABEL, type PathwayKnowledge } from "@/lib/leads/engine/group-types";

export interface FacetDef {
  key: string;
  name: string;
  /** A platform or a language is a FACT, not a verdict — it gets no swatch. */
  isFact: boolean;
  /** Count-derived colours are shown but are not per-value recolourable. */
  derived: boolean;
}

export type FacetGroupKey = "core" | "appweb" | "stack" | "rest";

/**
 * Which facets sit in which rail group.
 *
 * Neither q1 nor q3 appears: both are retired, and the reference build gave
 * neither a facet either (`NO_FACET = new Set(["q1","q3"])`).
 *
 * q1 briefly had one here, on the reasoning that "show me churches already
 * thinking in journeys" is a filter a salesperson would want. It is back out
 * with the question. The pathway itself did not go anywhere — it is in Key
 * findings as its named steps — but a facet over a verdict nobody can see is a
 * filter whose results cannot be explained by anything on screen.
 *
 * This list is only consulted for keys `buildFacets` emits, which come from
 * `DISPLAY_KEYS`; an entry for a retired question would be dead rather than
 * harmful. It is removed anyway, so the two lists cannot tell different stories.
 */
const GROUP_OF: Record<string, FacetGroupKey> = {
  q2: "core",
  steps: "core",
  pathway: "core",
  q5: "core",
  lang: "core",
  q7: "appweb",
  q7_platform: "appweb",
  q8: "appweb",
  q8_platform: "appweb",
  // The software a church already runs. Its own group: these are the only
  // facets about the church's STACK rather than about what its website says,
  // and they were the largest gap in the rail — `pf` reached no filter at all
  // while being the one fact about what we would be replacing.
  chms: "stack",
  tooling: "stack",
  q4: "rest",
  q6: "rest",
  q9: "rest",
  q10: "rest",
};

export const GROUP_LABEL: Record<FacetGroupKey, string> = {
  core: "core filters",
  appweb: "app & website",
  stack: "software they run",
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
    if (qk === "q2") {
      push("steps", "Next steps", false, true);
      // Discipleship rides alongside Next steps, as it does in the tiles and in
      // Key findings. NOT a fact: its three values carry the tile's colours, so
      // the swatch has to be able to paint them.
      push("pathway", "Discipleship");
    }

    const platformKey = PLATFORM_FACETS[qk];
    if (platformKey && views.some((v) => v.q(qk)?.platform_key)) {
      // q7/q8 carry TWO independent facets: the verdict and the platform.
      // "Show me every Wix church" and "show me every clunky site" are
      // different questions, and conflating them was the original bug.
      push(platformKey, `${QSHORT[qk]} platform`, true);
    }
  }

  /**
   * The stack group, built only where the data supports it.
   *
   * `chms` and `tooling` read ONE recorded field through two different
   * questions, so both are emitted whenever any church has a backend we can
   * classify — see `BACKEND_KINDS`. A vendor selling both appears in both lists,
   * which is why neither can be derived from the other by subtraction.
   */
  if (views.some((v) => backendIsKind(v.backend, "chms"))) {
    push("chms", "ChMS", true);
  }
  if (views.some((v) => backendIsKind(v.backend, "tooling"))) {
    push("tooling", "Other tooling", true);
  }
  if (views.some((v) => v.lang)) push("lang", "Language", true);

  return out;
}

/**
 * How a facet VALUE reads in the dropdown.
 *
 * One function because the panel had grown a four-branch ternary and each new
 * facet added a branch to it — the backend keys would have rendered as
 * `rightnowmedia`, and the pathway states as `unknown`, in the one place a
 * reader is choosing between them.
 */
export function facetValueLabel(key: string, value: string): string {
  if (key === "steps") return `${value} / 8`;
  if (key === "q2") return `${value} paid`;
  if (key === "pathway") return PATHWAY_FACET_LABEL[value as PathwayKnowledge] ?? value;
  if (key === "chms" || key === "tooling") return backendName(value) || value;
  return "";
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
  // The three discipleship states read best strongest-first, matching the order
  // the tile and the dossier present them in. Alphabetical would put "Not
  // checked" between the two real findings.
  if (key === "pathway") {
    const order: Record<string, number> = { has: 0, none: 1, unknown: 2 };
    return vals.sort((a, b) => (order[a] ?? 9) - (order[b] ?? 9));
  }
  // Backend lists sort by DISPLAY name, not by key — otherwise "Church Community
  // Builder" files under `ccb` and "Text In Church" under `textinchurch`, so the
  // list is alphabetical by a string the reader cannot see.
  if (key === "chms" || key === "tooling") {
    return vals.sort((a, b) => (backendName(a) || a).localeCompare(backendName(b) || b));
  }
  return vals.sort();
}
