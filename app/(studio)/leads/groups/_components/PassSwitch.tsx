"use client";

/**
 * REVIEW-PASS-TEMP — three treatments of the evidence, switchable in place.
 *
 * TEMPORARY, AND DESIGNED TO BE DELETED. The design language is settled; what is
 * open is the shape of the three fields somebody actually reads. Screenshots are
 * a bad way to decide that, because the thing being judged is what it feels like
 * to SKIM twenty real churches, and that only shows up with a real batch in
 * front of you. So all three ship behind this switch and then:
 *
 *     grep -rn "REVIEW-PASS-TEMP" app lib
 *
 * …is the complete list of what to remove. The winner's strings get inlined into
 * `church/skin.ts` and `church/passes.ts` goes with this file.
 *
 * BEHAVIOUR IS IDENTICAL IN ALL THREE. Same data, same field order, same copy,
 * same contacts rule, same operations — `church/parts.tsx` renders all of them.
 * Only the shape of one item changes.
 *
 * COMPARE IS THE FOURTH POSITION and it is the reason this is worth building.
 * It renders ONE church three times, labelled. Switching whole pages makes you
 * compare a memory against a screen; three renderings in one scroll do not.
 */

import { useSyncExternalStore } from "react";
import { PASSES, PASS_ORDER, type Pass } from "./church/passes";

export type PassMode = Pass | "compare";

const KEY = "leads-review-pass";
const DEFAULT: PassMode = "a";

function isMode(v: string | null): v is PassMode {
  return v === "a" || v === "b" || v === "c" || v === "compare";
}

/**
 * An external store rather than state seeded in an effect.
 *
 * `localStorage` does not exist on the server, so reading it during render is a
 * hydration mismatch — server renders one pass, client renders another, React
 * complains — and reading it in an effect is a `set-state-in-effect` that paints
 * the default first and then flips. `useSyncExternalStore` is the case this API
 * is for: it takes a server snapshot (the default) and a client snapshot
 * (storage) and lets React reconcile them itself.
 */
let current: PassMode | null = null;
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): PassMode {
  if (current === null) {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      // A private window with storage denied still gets to switch — it just
      // will not remember. Losing the setting is not worth an error.
    }
    current = isMode(saved) ? saved : DEFAULT;
  }
  return current;
}

const getServerSnapshot = (): PassMode => DEFAULT;

export function useReviewPass(): [PassMode, (m: PassMode) => void] {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const choose = (m: PassMode) => {
    current = m;
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* see above */
    }
    for (const cb of listeners) cb();
  };

  return [mode, choose];
}

const OPTIONS: { value: PassMode; label: string; title: string }[] = [
  ...PASS_ORDER.map((p) => ({
    value: p as PassMode,
    label: p.toUpperCase(),
    title: `${PASSES[p].title} — ${PASSES[p].hint}`,
  })),
  {
    value: "compare",
    label: "⇹",
    title: "Compare — the same church rendered all three ways, one after another.",
  },
];

export function PassSwitch({
  mode,
  onChoose,
}: {
  mode: PassMode;
  onChoose: (m: PassMode) => void;
}) {
  return (
    <div
      // Bottom-LEFT: the export bar owns the bottom-right of this page, and a
      // temporary control must not sit on top of the permanent one.
      className="fixed bottom-4 left-4 z-40 flex items-center gap-1 rounded-full border border-lead-line bg-lead-panel px-2 py-1.5 shadow-lg"
    >
      <span className="px-1 font-mono text-[9px] tracking-[0.14em] text-lead-ink2 uppercase">
        pass
      </span>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={mode === o.value}
          onClick={() => onChoose(o.value)}
          className={`size-6 rounded-full font-mono text-[11px] transition-colors ${
            mode === o.value
              ? "bg-lead-brand font-bold text-white"
              : "text-lead-ink2 hover:bg-lead-panel2 hover:text-lead-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
