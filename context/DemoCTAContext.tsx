"use client";

import { createContext, useContext } from "react";

/**
 * Opens the demo's "this is a demo → let's talk" popup. Every placeholder button
 * in a template (View profile, the step CTAs, Give again, Details, …) calls this
 * instead of doing nothing, so each one becomes a soft nudge toward the CTA.
 * Defaults to a no-op so a template rendered outside a demo just does nothing.
 */
export const DemoCTAContext = createContext<() => void>(() => {});

export function useDemoCTA(): () => void {
  return useContext(DemoCTAContext);
}
