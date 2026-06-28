"use client";

import { createContext, useContext } from "react";

/**
 * Opens the demo's "this is a demo → let's talk" popup. Every placeholder button
 * in a template (the step CTAs, Give again, Details, …) calls this instead of
 * doing nothing, so each one becomes a soft nudge toward the CTA.
 *
 * The optional `feature` names what the clicked button stood for ("Groups
 * Finder", "Giving", …); the popup turns it into a "{feature} Available in Full
 * Build" headline. Omit it for the generic "Want this for your church?" ask.
 * Defaults to a no-op so a template rendered outside a demo just does nothing.
 */
export const DemoCTAContext = createContext<(feature?: string) => void>(() => {});

export function useDemoCTA(): (feature?: string) => void {
  return useContext(DemoCTAContext);
}
