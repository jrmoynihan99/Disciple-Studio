"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Btn } from "@/components/ui";

/* One nav, every page. "Product" opens the engine submenu; its three
   items are the vehicle pages. Work deep-links to the home page's
   work section (Lenis scrolls it in place when already home).

   Desktop is a full-width bar that turns to glass on scroll. Mobile is
   NOT a bar: the container is inset off every edge and transparent, so
   the mark, the CTA and the hamburger read as items floating over the
   page. Nothing sits behind them, so they slide away on scroll down and
   come back on scroll up; the opened menu is a full-screen overlay that
   passes *under* them (z-[90] < z-[100]) so the mark and the X stay put. */
const ENGINE_LABEL = "The Discipleship Engine";
const MOBILE = "(max-width: 860px)";

/* Each glyph echoes that vehicle's visual on the home page: browser
   chrome, a phone, the CMS sidebar + editor. */
function Icon({ paths }: { paths: string[] }) {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const PRODUCT_LINKS = [
  {
    label: "The Website",
    desc: "Your home base.",
    href: "/website",
    icon: [
      "M3.75 2.9h8.5a2 2 0 0 1 2 2v6.2a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2V4.9a2 2 0 0 1 2-2Z",
      "M1.75 6.15h12.5",
      "M4.1 4.5h.01",
      "M6 4.5h.01",
    ],
  },
  {
    label: "The App",
    desc: "In their pocket.",
    href: "/app",
    icon: [
      "M6.1 1.75h3.8a1.9 1.9 0 0 1 1.9 1.9v8.7a1.9 1.9 0 0 1-1.9 1.9H6.1a1.9 1.9 0 0 1-1.9-1.9v-8.7a1.9 1.9 0 0 1 1.9-1.9Z",
      "M6.95 3.85h2.1",
      "M8 12.05h.01",
    ],
  },
  {
    label: "The CMS",
    desc: "Your control panel.",
    href: "/cms",
    icon: [
      "M3.75 2.9h8.5a2 2 0 0 1 2 2v6.2a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2V4.9a2 2 0 0 1 2-2Z",
      "M6.15 2.9v10.2",
      "M8.5 6.3h3.3",
      "M8.5 9.1h2.1",
    ],
  },
];
const LINKS = [
  { label: "Work", href: "/#work" },
  { label: "Who We Are", href: "/about-us" },
];

/* the floating treatment and the overlay are one breakpoint, read from JS
   for the scroll behaviour (server snapshot is desktop) */
function subscribeMobile(onChange: () => void) {
  const mq = window.matchMedia(MOBILE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export default function Nav({ active }: { active?: string }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE).matches,
    () => false,
  );

  /* Adjust during render rather than in an effect (same dance as
     Providers' RevealDelayBridge): the menu closes itself on navigation
     — view-transition clicks included — and its markup is mobile-only,
     so leaving the breakpoint discards it too. */
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }
  if (open && !isMobile) setOpen(false);

  /* Glass on the desktop bar past 24px. On mobile the floating items fade
     away on scroll down and return on any scroll up — small deadzone so
     trackpad/finger jitter doesn't toggle them. They stay put while the
     menu is open. */
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = Math.max(0, window.scrollY);
      const dy = y - lastY;
      lastY = y;
      setScrolled(y > 24);
      if (!isMobile || open) return;
      if (y < 80) setHidden(false);
      else if (dy > 2) setHidden(true);
      else if (dy < -2) setHidden(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile, open]);

  /* Scroll lock while the overlay is up. Body only, never documentElement:
     Lenis drives the window scroller in root mode, and touch is native
     (syncTouch: false), so a body lock is all that's needed. */
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const productActive = PRODUCT_LINKS.some((l) => l.href === active);
  /* the items never slide away underneath an open menu */
  const away = hidden && !open;
  /* a faded-out floating item must also stop eating taps */
  const tap = away ? "pointer-events-none" : "pointer-events-auto";

  return (
    <>
      <header
        className={`fixed left-2 right-2 top-2 z-[100] pointer-events-none transition-[opacity,transform,background-color,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] min-[861px]:pointer-events-auto min-[861px]:left-0 min-[861px]:right-0 min-[861px]:top-0 min-[861px]:border-b ${
          away ? "-translate-y-2 opacity-0" : "translate-y-0 opacity-100"
        } ${
          scrolled
            ? "min-[861px]:border-paper/10 min-[861px]:bg-night/85 min-[861px]:backdrop-blur-[14px]"
            : "min-[861px]:border-transparent"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-3 min-[861px]:h-[70px] min-[861px]:px-7 min-[1100px]:px-12">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- plain anchors are the convention across this site: Providers intercepts every internal click and routes it through next-view-transitions, so Link would only duplicate that */}
          <a className={`inline-flex items-center gap-2.5 ${tap}`} href="/">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-accent text-[19px] text-white shadow-[0_8px_22px_-10px_rgba(0,0,0,0.9)] min-[861px]:h-7 min-[861px]:w-7 min-[861px]:rounded-lg min-[861px]:text-[15px] min-[861px]:shadow-none">
              {"✝"}
            </span>
            {/* the mark carries the brand on mobile — no wordmark next to it */}
            <span className="hidden text-[17px] tracking-[-0.02em] [font-weight:680] min-[861px]:inline">
              Disciple Studio
            </span>
          </a>
          <nav className="flex items-center gap-[30px] max-[860px]:hidden">
            <div className="group relative">
              <button
                type="button"
                aria-haspopup="menu"
                className={`inline-flex items-center gap-[7px] text-[14.5px] font-medium transition-colors duration-150 ${
                  productActive
                    ? "text-paper"
                    : "text-paper/65 group-hover:text-paper group-focus-within:text-paper"
                }`}
              >
                Product
                <svg
                  aria-hidden
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  className="translate-y-px transition-transform duration-200 group-hover:rotate-180"
                >
                  <path
                    d="M1.5 3.25 5 6.75l3.5-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {/* pt bridges the hover gap between the trigger and the panel */}
              <div className="invisible absolute left-1/2 top-full -translate-x-1/2 translate-y-1.5 pt-[22px] opacity-0 transition-[opacity,transform,visibility] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="w-[276px] rounded-2xl border border-paper/10 bg-[#181510]/95 p-2 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.9)] backdrop-blur-[14px]">
                  <div className="px-3 pb-2 pt-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft">
                    {ENGINE_LABEL}
                  </div>
                  {PRODUCT_LINKS.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      className={`group/item flex items-center gap-3 rounded-[11px] px-2.5 py-2 transition-colors duration-150 hover:bg-paper/[0.06] ${
                        active === l.href ? "bg-paper/[0.05]" : ""
                      }`}
                    >
                      <span
                        className={`grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] border transition-colors duration-150 ${
                          active === l.href
                            ? "border-accent/40 bg-accent/[0.16] text-accent-soft"
                            : "border-paper/10 bg-paper/[0.04] text-paper/55 group-hover/item:border-accent/35 group-hover/item:bg-accent/[0.13] group-hover/item:text-accent-soft"
                        }`}
                      >
                        <Icon paths={l.icon} />
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-[14px] font-semibold leading-tight ${
                            active === l.href ? "text-paper" : "text-paper/85"
                          }`}
                        >
                          {l.label}
                        </span>
                        <span className="mt-[3px] block text-[11.5px] leading-tight text-paper/45">
                          {l.desc}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
            {LINKS.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className={`text-[14.5px] font-medium transition-colors duration-150 ${
                  active === n.href
                    ? "text-paper"
                    : "text-paper/65 hover:text-paper"
                }`}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 min-[861px]:gap-3">
            <Btn
              href="/#work"
              variant="ghostLight"
              sm
              className={`max-[1000px]:hidden ${tap}`}
            >
              See our latest work
            </Btn>
            <Btn
              href="/book"
              sm
              className={`${tap} max-[860px]:shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_30px_-14px_rgba(0,0,0,0.9)]`}
            >
              Let{"’"}s Chat
            </Btn>
            {/* 44px hit area, morphs to an X */}
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`relative -mr-1.5 hidden h-11 w-11 place-items-center max-[860px]:grid ${tap}`}
            >
              <span className="relative block h-3.5 w-[21px]">
                <i
                  className={`absolute left-0 top-1/2 block h-[1.6px] w-full -translate-y-1/2 rounded-full bg-paper transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                    open ? "rotate-45" : "-translate-y-[7px]"
                  }`}
                />
                <i
                  className={`absolute left-0 top-1/2 block h-[1.6px] w-full -translate-y-1/2 rounded-full bg-paper transition-opacity duration-200 ${
                    open ? "opacity-0" : ""
                  }`}
                />
                <i
                  className={`absolute left-0 top-1/2 block h-[1.6px] w-full -translate-y-1/2 rounded-full bg-paper transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                    open ? "-rotate-45" : "translate-y-[7px]"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu — full-screen overlay that sits UNDER the floating items,
          so the mark, the CTA and the X stay visible and tappable on top of it. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: "easeOut" }}
            className="fixed inset-0 z-[90] bg-night/[0.97] backdrop-blur-[6px] min-[861px]:hidden"
            onClick={() => setOpen(false)}
          >
            <nav className="flex h-full flex-col overflow-y-auto px-5 pb-12 pt-[92px]">
              <MenuItem reduced={reduced} i={0}>
                <div className="pb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-soft">
                  {ENGINE_LABEL}
                </div>
              </MenuItem>
              {PRODUCT_LINKS.map((n, i) => (
                <MenuItem key={n.href} reduced={reduced} i={i + 1}>
                  <a
                    href={n.href}
                    className="flex items-center gap-3.5 py-2.5"
                    onClick={() => setOpen(false)}
                  >
                    <span
                      className={`grid h-[38px] w-[38px] flex-none place-items-center rounded-xl border ${
                        active === n.href
                          ? "border-accent/40 bg-accent/[0.16] text-accent-soft"
                          : "border-paper/10 bg-paper/[0.04] text-paper/55"
                      }`}
                    >
                      <Icon paths={n.icon} />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-[17px] font-semibold leading-tight ${
                          active === n.href ? "text-paper" : "text-paper/85"
                        }`}
                      >
                        {n.label}
                      </span>
                      <span className="mt-[3px] block text-[12.5px] leading-tight text-paper/45">
                        {n.desc}
                      </span>
                    </span>
                  </a>
                </MenuItem>
              ))}
              <MenuItem reduced={reduced} i={PRODUCT_LINKS.length + 1}>
                <div className="my-5 h-px bg-paper/10" />
              </MenuItem>
              {LINKS.map((n, i) => (
                <MenuItem
                  key={n.href}
                  reduced={reduced}
                  i={PRODUCT_LINKS.length + 2 + i}
                >
                  <a
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={`block py-2 font-serif text-[30px] leading-[1.2] tracking-[-0.025em] [font-weight:460] ${
                      active === n.href ? "text-accent-soft" : "text-paper"
                    }`}
                  >
                    {n.label}
                  </a>
                </MenuItem>
              ))}
              <MenuItem
                reduced={reduced}
                i={PRODUCT_LINKS.length + LINKS.length + 2}
              >
                <div className="mt-8 flex flex-col gap-3">
                  <Btn
                    href="/#work"
                    variant="ghostLight"
                    onClick={() => setOpen(false)}
                    className="w-full"
                  >
                    See our latest work
                  </Btn>
                  <Btn
                    href="/book"
                    onClick={() => setOpen(false)}
                    className="w-full"
                  >
                    Let{"’"}s Chat
                  </Btn>
                </div>
              </MenuItem>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* one staggered row of the mobile menu */
function MenuItem({
  reduced,
  i,
  children,
}: {
  reduced: boolean | null;
  i: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : 0.4,
        ease: "easeOut",
        delay: reduced ? 0 : 0.06 + i * 0.045,
      }}
    >
      {children}
    </motion.div>
  );
}
