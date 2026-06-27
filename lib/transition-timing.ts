"use client";

import { createContext, useContext } from "react";

/**
 * A base delay (seconds) added to every reveal beneath a provider. Lets a whole
 * subtree be pushed back in time — e.g. to wait out a page-load transition —
 * without threading a `delay` prop through each reveal. Each reveal adds its own
 * `delay` on top of this. Defaults to 0 (no offset) when no provider is present.
 */
export const RevealDelayContext = createContext<number>(0);

/** The ambient base reveal delay (seconds) from the nearest provider. */
export function useRevealDelay(): number {
  return useContext(RevealDelayContext);
}

/** Provider to offset all reveals in a subtree by `seconds`. */
export const RevealDelayProvider = RevealDelayContext.Provider;
