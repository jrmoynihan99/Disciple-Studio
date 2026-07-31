"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Theme, per DEVICE.
 *
 * This is the one piece of state that must NEVER sync. Marks, notes, colour
 * overrides and favor defaults are shared across the team; which theme a
 * particular screen is comfortable at is not a fact about the person.
 *
 * It stamps `data-lead-theme` on <html> rather than toggling `.light`, because
 * studio-globals.css has its own `.light` hook: sharing it would mean the
 * console's preference silently reskins /studio and /admin, which have no
 * toggle to flip it back. An attribute cannot alias with a class.
 *
 * The `<html>` attribute is the single source of truth — set before first paint
 * by the inline script in `layout.tsx`, then read through
 * `useSyncExternalStore`. Mirroring it into `useState` inside an effect would
 * cost a second render on every mount and create a copy that can disagree with
 * the DOM.
 */
export type LeadTheme = "light" | "dark";

const KEY = "leads-theme";
const EVENT = "leads-theme-change";

function subscribe(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

function getSnapshot(): LeadTheme {
  return document.documentElement.getAttribute("data-lead-theme") === "dark"
    ? "dark"
    : "light";
}

/** The server cannot know the preference; the pre-paint script corrects it. */
function getServerSnapshot(): LeadTheme {
  return "light";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const apply = useCallback((next: LeadTheme) => {
    document.documentElement.setAttribute("data-lead-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode — the choice just will not persist */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const toggle = useCallback(
    () => apply(getSnapshot() === "dark" ? "light" : "dark"),
    [apply],
  );

  return { theme, toggle, apply };
}
