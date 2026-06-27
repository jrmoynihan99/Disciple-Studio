"use client";

import { createContext, useContext } from "react";

/**
 * Coordinates a group of reveal elements so they animate together.
 *
 * `SectionReveal` watches a wrapper with `useInView` and publishes
 * `{ triggered }` here. Child reveals (`HeadingReveal`, `Reveal`, …) read it via
 * `useSectionReveal()`: while inside a section they stay hidden until the
 * section is `triggered`, then play (offset by their own `delay`) so a whole
 * band reveals as one staggered motion. Used outside a section, each reveal
 * falls back to its own `whileInView` trigger.
 */
export type SectionRevealValue = { triggered: boolean };

export const SectionRevealContext = createContext<SectionRevealValue | null>(null);

/** Read the enclosing section's reveal state, or null when unwrapped. */
export function useSectionReveal(): SectionRevealValue | null {
  return useContext(SectionRevealContext);
}
