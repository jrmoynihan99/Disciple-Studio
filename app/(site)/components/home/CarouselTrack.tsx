"use client";

import { useEffect, useRef, type ReactNode } from "react";

/* ——— the hero marquee's shell ———
   Desktop is untouched: the track is a plain CSS `marq` transform inside a
   clipped box. Mobile turns the same markup into a real scroll container,
   so the deck can be grabbed and thrown with the OS's own momentum, and
   the drift is driven by scrollLeft instead of the transform — one shared
   position, so a throw picks up exactly where the drift left off and the
   drift resumes exactly where the throw stopped.

   Looping without ever fighting a fling: mobile renders a third copy of
   the deck and the position is parked in the middle one, which leaves a
   whole deck of runway in either direction — further than a throw goes.
   Wrapping means assigning scrollLeft, which kills in-flight momentum on
   iOS, so it only ever happens on a frame we're driving ourselves. */

const MOBILE_MQ = "(max-width: 920px)";

/* Copies rendered on mobile — must match the deck count in Carousel. */
const COPIES = 3;

/* One deck per 60s, the same cadence as the desktop `marq` keyframes. */
const LOOP_SECONDS = 60;

/* A fling is over once the position stops changing between samples. */
const SETTLE_MS = 90;

export default function CarouselTrack({
  className,
  trackClassName,
  children,
}: {
  className: string;
  trackClassName: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mobile = window.matchMedia(MOBILE_MQ);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let settle = 0;
    let frame = 0;
    let held = false;
    /* Off on desktop, where the marquee is the CSS transform and the box is
       clipped rather than scrolled. Nothing below may touch scrollLeft
       there — the element is still programmatically scrollable, so a stray
       wheel event would shunt the track off its own animation. */
    let live = false;
    /* Our own position, so sub-pixel drift accumulates even where the
       browser hands scrollLeft back rounded. */
    let pos = 0;

    /* Measured every frame rather than cached: it survives a resize, a late
       image, and the zoom the mobile deck is rendered at. */
    const deck = () => el.scrollWidth / COPIES;

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      frame = 0;
    };

    const drift = (t: number) => {
      raf = requestAnimationFrame(drift);
      const dt = frame ? Math.min((t - frame) / 1000, 0.05) : 0;
      frame = t;
      const d = deck();
      if (!d) return;
      pos += (d / LOOP_SECONDS) * dt;
      if (pos >= d * 2) pos -= d;
      el.scrollLeft = pos;
    };

    const run = () => {
      stop();
      pos = el.scrollLeft;
      raf = requestAnimationFrame(drift);
    };

    /* Back into the middle copy, so the next throw has full runway both
       ways. The content repeats, so the jump is invisible. */
    const recentre = () => {
      const d = deck();
      if (!d) return;
      el.scrollLeft = (((el.scrollLeft - d) % d) + d) % d + d;
    };

    /* Poll until the position holds still — that's the momentum spent — and
       only then take the wheel back. */
    const watch = () => {
      window.clearTimeout(settle);
      let prev = el.scrollLeft;
      const tick = () => {
        if (held) return;
        const x = el.scrollLeft;
        if (Math.abs(x - prev) < 0.5) {
          recentre();
          run();
          return;
        }
        prev = x;
        settle = window.setTimeout(tick, SETTLE_MS);
      };
      settle = window.setTimeout(tick, SETTLE_MS);
    };

    const onGrab = () => {
      if (!live) return;
      held = true;
      window.clearTimeout(settle);
      stop();
    };
    const onRelease = () => {
      if (!live) return;
      held = false;
      watch();
    };
    /* Trackpads and mice reach this too on a narrow window. */
    const onWheel = () => {
      if (!live) return;
      stop();
      watch();
    };

    const apply = () => {
      stop();
      window.clearTimeout(settle);
      held = false;
      live = mobile.matches;
      if (!live) {
        el.scrollLeft = 0;
        return;
      }
      el.scrollLeft = deck();
      if (!still.matches) run();
    };

    apply();
    el.addEventListener("touchstart", onGrab, { passive: true });
    el.addEventListener("touchend", onRelease, { passive: true });
    el.addEventListener("touchcancel", onRelease, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    mobile.addEventListener("change", apply);
    still.addEventListener("change", apply);

    return () => {
      stop();
      window.clearTimeout(settle);
      el.removeEventListener("touchstart", onGrab);
      el.removeEventListener("touchend", onRelease);
      el.removeEventListener("touchcancel", onRelease);
      el.removeEventListener("wheel", onWheel);
      mobile.removeEventListener("change", apply);
      still.removeEventListener("change", apply);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      <div className={trackClassName}>{children}</div>
    </div>
  );
}
