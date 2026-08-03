"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";

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
 * by the pre-paint script in `layout.tsx`, then read through
 * `useSyncExternalStore`. Mirroring it into `useState` inside an effect would
 * cost a second render on every mount and create a copy that can disagree with
 * the DOM.
 *
 * IT HAD EXACTLY ONE WRITER AND IT ONLY RAN ON A HARD LOAD. A `<script>` in the
 * initial HTML executes; the same element re-rendered by React during a
 * client-side navigation does not — React says so in a dev warning, and the
 * consequence was that arriving at the console from anywhere inside the app left
 * the attribute unset. A dark-preference reviewer got the light token set, and
 * `html[data-lead-theme]` doubles as the console's route marker in
 * `leads-theme.css`, so the scrollbars stayed hidden too. `ensureLeadTheme` is
 * the second writer, and it runs on entry however you arrived.
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

/**
 * Stamp the attribute if nothing has. Idempotent, and deliberately a NO-OP when
 * it is already set — the pre-paint script wins on a hard load and a reviewer's
 * explicit toggle wins over both.
 *
 * THE RULE EXISTS TWICE AND CANNOT BE SHARED. The other copy is a string in
 * `layout.tsx` that has to run before any module is evaluated, so it cannot
 * import this one. Both must answer identically: stored choice, else the OS
 * preference, else light. Change one and change the other — a disagreement shows
 * up only on a client-side navigation by a dark-preference user, which is
 * precisely the case nobody re-tests.
 */
export function ensureLeadTheme(): void {
  const el = document.documentElement;
  if (el.getAttribute("data-lead-theme")) return;
  el.setAttribute("data-lead-theme", preferredTheme());
}

/** What a device with no stored choice should get. Shared by the two writers. */
export function preferredTheme(): LeadTheme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    // Private mode, or a browser refusing matchMedia. Light is the safe answer:
    // it is the token set the server rendered, so nothing shifts under the user.
    return "light";
  }
}

/**
 * Mount this once inside the console. It renders nothing and exists only to run
 * `ensureLeadTheme` in a LAYOUT effect — synchronously before the browser paints,
 * so a client-side navigation into `/leads` produces no flash of the wrong token
 * set rather than a corrected one.
 */
export function LeadThemeGuard(): null {
  useLayoutEffect(ensureLeadTheme, []);
  return null;
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
