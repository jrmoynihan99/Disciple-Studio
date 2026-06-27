"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Fires `onOutside` on a pointerdown outside `ref`, while `active` is true.
 *
 * Why not a `fixed inset-0` backdrop: the reveal animations wrap content in a
 * `will-change: transform` ancestor, which becomes the containing block for any
 * `fixed` descendant — so a backdrop only covers its own section, not the
 * viewport, and clicks past it never dismiss the menu. A document-level listener
 * has no such trap.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  onOutside: () => void,
) {
  const cb = useRef(onOutside);
  cb.current = onOutside;

  useEffect(() => {
    if (!active) return;
    const handle = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb.current();
    };
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [ref, active]);
}
