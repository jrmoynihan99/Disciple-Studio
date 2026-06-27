import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion vocabulary for the dashboard templates.
 *
 * Two jobs:
 *  - keep interactive transitions (step switches, toggles, decks) consistent
 *    across the three templates;
 *  - match the house easing used by the reveal-animations so on-load reveals and
 *    in-page interactions feel like one motion language.
 *
 * `EASE` is the same curve the reveal components use ([0.08, 0.82, 0.17, 1]);
 * `SPRING` drives shared-element / layout morphs (the highlight that slides
 * between pathway steps, the segmented toggle pill, etc.).
 */

/** House easing — a soft, fast-out/slow-in curve shared with the reveals. */
export const EASE: [number, number, number, number] = [0.08, 0.82, 0.17, 1];

/** Snappy-but-smooth spring for layout & shared-element (layoutId) morphs. */
export const SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.9,
};

/** Softer spring for hover lifts / press feedback. */
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 26,
};

/** Quick content crossfade (focal-card / tile copy swapping between states). */
export const CROSSFADE: Transition = { duration: 0.32, ease: EASE };

/**
 * Vertical content swap used with `AnimatePresence mode="wait"`: the outgoing
 * copy lifts and fades, the incoming copy rises into place.
 */
export const swapUp: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

/**
 * Directional deck slide (Warm Guide's next-step cards). `custom` is the
 * navigation direction: +1 = advancing (new card enters from the right),
 * -1 = going back.
 */
export const slideDeck: Variants = {
  initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 64 : -64 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -64 : 64 }),
};

/** Stagger container for a freshly-swapped list of rows. */
export const listContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: EASE } },
};

/** A single row inside {@link listContainer}. */
export const listItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: EASE } },
};
