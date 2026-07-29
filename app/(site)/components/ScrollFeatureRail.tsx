"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Glow } from "@/app/(site)/components/ui";

export type RailItem = { title: string; desc: string };

const EASE = [0.08, 0.82, 0.17, 1] as [number, number, number, number];

/* Each feature owns an equal slice of the pinned scroll. Handoffs
   crossfade across a window this wide on either side of a slice
   boundary (as a fraction of one slice). */
const FADE = 0.24;

/* How much scroll travel each feature gets, in vh. The wrapper adds one
   extra 100vh on top (the screen the stage occupies while pinned), so
   travel per slice is exactly this for any item count. */
const VH_PER_ITEM = 90;

const pad = (n: number) => String(n).padStart(2, "0");

/* One demo panel on the pinned stage, scrubbed by scroll: it rises in
   as its slice begins, drifts slowly while it holds the stage, and
   lifts away as the next takes over. The first and last pin open at the
   section's ends so the stage is never empty. `still` (reduced motion)
   keeps the crossfade — it tracks the user's own scrolling — but drops
   the travel. */
function StagePanel({
  index,
  count,
  progress,
  still,
  children,
}: {
  index: number;
  count: number;
  progress: MotionValue<number>;
  still: boolean;
  children: ReactNode;
}) {
  const seg = 1 / count;
  const start = index * seg;
  const end = start + seg;
  const fade = seg * FADE;
  const first = index === 0;
  const last = index === count - 1;

  const stops = first
    ? [0, end - fade, end + fade]
    : last
      ? [start - fade, start + fade, 1]
      : [start - fade, start + fade, end - fade, end + fade];

  const opacity = useTransform(
    progress,
    stops,
    first ? [1, 1, 0] : last ? [0, 1, 1] : [0, 1, 1, 0]
  );
  /* Fast through the handoff, a slow drift in between — the panel never
     sits perfectly still while it has the stage. */
  const y = useTransform(
    progress,
    stops,
    first ? [0, -18, -76] : last ? [76, 18, 0] : [76, 18, -18, -76]
  );
  const scale = useTransform(
    progress,
    stops,
    first ? [1, 1, 0.95] : last ? [0.95, 1, 1] : [0.95, 1, 1, 0.95]
  );

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex items-center"
      style={still ? { opacity } : { opacity, y, scale }}
    >
      <div className="w-full">{children}</div>
    </motion.div>
  );
}

/* Scroll-driven feature tour: the numbered list on the left and one
   live demo panel on the right, pinned for `items.length` screens of
   scroll. Scrolling walks the highlight down the rail while the panels
   hand the stage to each other in sync; clicking a label jumps the
   scroll there. Same slot API as the old click-to-switch FeatureRail —
   panels stay server-rendered. Below 980px there's no pinning: each
   feature stacks as label + panel with plain in-view reveals. */
export default function ScrollFeatureRail({
  items,
  panels,
}: {
  items: RailItem[];
  panels: ReactNode[];
}) {
  const count = items.length;
  const uid = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [stickyTop, setStickyTop] = useState(0);
  const reduced = useReducedMotion() ?? false;

  /* The sticky block is natural-height (not a full screen), pinned at
     whatever offset centers it in the viewport. Sitting in normal flow
     until its top reaches that offset is what keeps the section head a
     normal margin away at rest — the first stretch of scrolling walks
     the head out and the rail into its centered spot, then it pins. */
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const measure = () =>
      setStickyTop(Math.max(0, (window.innerHeight - el.offsetHeight) / 2));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });
  /* Lenis only smooths notched wheels, so the scrub gets its own light
     spring — enough glide that trackpads read as buttery too, not so
     much that the stage feels detached from the scrollbar. */
  const glide = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 34,
    mass: 0.6,
  });
  const progress = reduced ? scrollYProgress : glide;

  const toIndex = (v: number) =>
    Math.min(count - 1, Math.max(0, Math.floor(v * count)));
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(toIndex(v)));
  /* Landing mid-section (deep link, back nav) fires no change event. */
  useEffect(() => {
    setActive(toIndex(scrollYProgress.get()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotTop = useTransform(progress, (v) => `${v * 100}%`);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.5 / count], [1, 0]);

  const scrollToItem = (i: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    /* Middle of the slice — well clear of both crossfade windows. */
    window.scrollTo({
      top: top + (span * (i + 0.5)) / count,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const enter = (delay: number) => ({
    initial: { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.35 },
    transition: { duration: 1.1, ease: EASE, delay },
  });

  return (
    <>
      {/* ── Desktop: the pinned tour ─────────────────────────────── */}
      <div
        ref={wrapRef}
        className="relative mt-[72px] max-[980px]:hidden"
        style={{ height: `calc(${count * VH_PER_ITEM}vh + 100vh)` }}
      >
        <div ref={stickyRef} className="sticky" style={{ top: stickyTop }}>
          <Glow className="right-[-60px] top-1/2 h-[640px] w-[820px] -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.16),rgba(187,74,35,0.04)_55%,transparent_78%)]" />
          <div className="relative grid w-full grid-cols-[1fr_1.1fr] items-center gap-[72px]">
            <div>
              <motion.div
                {...enter(0)}
                className="mb-6 pl-8 font-mono text-xs font-medium tracking-[0.22em] text-accent-soft"
              >
                [ {pad(active + 1)}{" "}
                <span className="text-paper/40">/ {pad(count)}</span> ]
              </motion.div>
              <div className="relative pl-8">
                {/* Progress line: fills with the scroll, dot rides the tip */}
                <div className="absolute bottom-6 left-[3px] top-6 w-px bg-paper/[0.12]">
                  <motion.div
                    className="absolute inset-x-0 top-0 h-full origin-top bg-accent"
                    style={{ scaleY: progress }}
                  />
                  <motion.div
                    className="absolute left-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft shadow-[0_0_14px_rgba(224,118,79,0.9)]"
                    style={{ top: dotTop }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  {items.map((it, i) => {
                    const on = i === active;
                    return (
                      <motion.div key={it.title} {...enter(0.08 + i * 0.07)}>
                        <motion.button
                          type="button"
                          layout
                          transition={{ layout: { duration: 0.45, ease: EASE } }}
                          style={{ borderRadius: 18 }}
                          onClick={() => scrollToItem(i)}
                          aria-pressed={on}
                          className={`relative grid w-full cursor-pointer grid-cols-[44px_1fr] gap-5 px-6 py-[22px] text-left ${
                            on ? "" : "hover:bg-paper/[0.04]"
                          }`}
                        >
                          {on && (
                            <motion.span
                              layoutId={`${uid}-rail-highlight`}
                              className="absolute inset-0 bg-accent/10"
                              style={{ borderRadius: 18 }}
                              transition={{ duration: 0.45, ease: EASE }}
                            />
                          )}
                          <motion.span
                            layout="position"
                            className={`relative grid h-9 w-9 place-items-center rounded-full border-[1.5px] font-mono text-[13px] font-semibold transition-colors duration-300 ${
                              on
                                ? "border-transparent bg-accent text-white"
                                : "border-paper/20 text-paper/60"
                            }`}
                          >
                            {pad(i + 1)}
                          </motion.span>
                          <motion.span
                            layout="position"
                            className="relative min-w-0 self-center"
                          >
                            <span
                              className={`block font-serif text-[23px] tracking-[-0.01em] transition-colors duration-300 ${
                                on ? "" : "text-paper/65"
                              }`}
                            >
                              {it.title}
                            </span>
                            {on && (
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                  duration: 0.35,
                                  delay: 0.12,
                                  ease: EASE,
                                }}
                                className="mt-[5px] block text-[14.5px] leading-[1.5] text-paper/65"
                              >
                                {it.desc}
                              </motion.span>
                            )}
                          </motion.span>
                        </motion.button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
            <motion.div {...enter(0.25)} className="relative h-[min(600px,72vh)]">
              {panels.map((p, i) => (
                <StagePanel
                  key={i}
                  index={i}
                  count={count}
                  progress={progress}
                  still={reduced}
                >
                  {p}
                </StagePanel>
              ))}
            </motion.div>
          </div>
          <motion.div
            aria-hidden
            style={{ opacity: hintOpacity }}
            className="pointer-events-none absolute -bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-2.5 font-mono text-[10px] tracking-[0.22em] text-paper/45"
          >
            <span className="animate-[bob_2.2s_ease-in-out_infinite] text-accent-soft">
              {"↓"}
            </span>
            SCROLL
            <span className="animate-[bob_2.2s_ease-in-out_infinite] text-accent-soft">
              {"↓"}
            </span>
          </motion.div>
        </div>
      </div>

      {/* ── Mobile: stacked, no pinning ──────────────────────────── */}
      <div className="mt-14 hidden flex-col gap-[72px] max-[980px]:flex">
        {items.map((it, i) => (
          <div key={it.title}>
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -40px 0px" }}
              transition={{ duration: 1, ease: EASE }}
            >
              <div className="flex items-center gap-4">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-accent font-mono text-[13px] font-semibold text-white">
                  {pad(i + 1)}
                </span>
                <h3 className="font-serif text-[23px] tracking-[-0.01em]">
                  {it.title}
                </h3>
              </div>
              <p className="mt-2.5 text-[14.5px] leading-[1.5] text-paper/65">
                {it.desc}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -40px 0px" }}
              transition={{ duration: 1, ease: EASE, delay: 0.08 }}
              className="mt-6"
            >
              {panels[i]}
            </motion.div>
          </div>
        ))}
      </div>
    </>
  );
}
