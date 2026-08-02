"use client";

/**
 * REVIEW-DESIGN-TEMP — three candidate looks, switchable in place.
 *
 * TEMPORARY, AND DESIGNED TO BE DELETED. Screenshots are a bad way to choose a
 * design for a page whose whole job is reading twenty real churches: the thing
 * you are judging is what it feels like to skim, and that only shows up with
 * your own batch in front of you. So all three ship at once behind a switch, the
 * owner picks, and then:
 *
 *     grep -rn "REVIEW-DESIGN-TEMP" app lib
 *
 * …is the complete list of what to remove. The winner's values get inlined and
 * the three token sets in `leads-theme.css` go with this file.
 *
 * BEHAVIOUR IS IDENTICAL IN ALL THREE. Same data, same copy, same contacts rule,
 * same markup. Only type, colour, density and radius change — otherwise this
 * would not be a comparison of designs.
 *
 * The choice persists in `localStorage`, because comparing means switching back
 * and forth and a reload that lost the setting would make that tedious enough to
 * stop doing.
 */

import { useSyncExternalStore } from "react";

export type ReviewDesign = "a" | "b" | "c";

const KEY = "leads-review-design";
const DEFAULT: ReviewDesign = "a";

const OPTIONS: [ReviewDesign, string, string][] = [
  ["a", "A", "Editorial — the marketing site's language. Airy and warm."],
  ["b", "B", "Instrument — no serif, dense and monochrome. Most churches per screen."],
  ["c", "C", "Contrast — the church is loud, the evidence is quiet."],
];

function isDesign(v: string | null): v is ReviewDesign {
  return v === "a" || v === "b" || v === "c";
}

/**
 * An external store rather than state seeded in an effect.
 *
 * `localStorage` does not exist on the server, so reading it during render is a
 * hydration mismatch — server renders A, client renders C, React complains — and
 * reading it in an effect is a `set-state-in-effect` that paints the default
 * first and then flips. `useSyncExternalStore` is the case this API is for: it
 * takes a server snapshot (the default) and a client snapshot (storage) and
 * lets React reconcile them itself.
 */
let current: ReviewDesign | null = null;
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): ReviewDesign {
  if (current === null) {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      // A private window with storage denied still gets to switch — it just
      // will not remember. Losing the setting is not worth an error.
    }
    current = isDesign(saved) ? saved : DEFAULT;
  }
  return current;
}

const getServerSnapshot = (): ReviewDesign => DEFAULT;

export function useReviewDesign(): [ReviewDesign, (d: ReviewDesign) => void] {
  const design = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const choose = (d: ReviewDesign) => {
    current = d;
    try {
      localStorage.setItem(KEY, d);
    } catch {
      /* see above */
    }
    for (const cb of listeners) cb();
  };

  return [design, choose];
}

export function DesignSwitch({
  design,
  onChoose,
}: {
  design: ReviewDesign;
  onChoose: (d: ReviewDesign) => void;
}) {
  return (
    <div
      // Bottom-LEFT: the export bar owns the bottom-right of this page, and a
      // temporary control must not sit on top of the permanent one.
      className="fixed bottom-4 left-4 z-40 flex items-center gap-1 rounded-full border border-lead-line bg-lead-panel px-2 py-1.5 shadow-lg"
    >
      <span className="px-1 font-mono text-[9px] tracking-[0.14em] text-lead-ink2 uppercase">
        design
      </span>
      {OPTIONS.map(([value, label, title]) => (
        <button
          key={value}
          type="button"
          title={title}
          aria-pressed={design === value}
          onClick={() => onChoose(value)}
          className={`size-6 rounded-full font-mono text-[11px] transition-colors ${
            design === value
              ? "bg-lead-brand font-bold text-white"
              : "text-lead-ink2 hover:bg-lead-panel2 hover:text-lead-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
