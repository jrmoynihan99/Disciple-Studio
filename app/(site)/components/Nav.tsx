"use client";

import { useEffect, useState } from "react";
import { Btn } from "@/components/ui";

/* One nav, every page. "Product" opens the engine submenu; its three
   items are the vehicle pages. Work deep-links to the home page's
   work section (Lenis scrolls it in place when already home). */
const ENGINE_LABEL = "The Discipleship Engine";

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
    desc: "Publish once.",
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

export default function Nav({ active }: { active?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const productActive = PRODUCT_LINKS.some((l) => l.href === active);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[100] border-b transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-paper/10 bg-night/85 backdrop-blur-[14px]"
          : "border-transparent max-[920px]:border-paper/10 max-[920px]:bg-night"
      }`}
    >
      <div className="flex h-[70px] items-center justify-between px-12 max-[920px]:h-[52px] max-[920px]:px-4">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- plain anchors are the convention across this site: Providers intercepts every internal click and routes it through next-view-transitions, so Link would only duplicate that */}
        <a className="inline-flex items-center gap-2.5" href="/">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-[15px] text-white">
            {"✝"}
          </span>
          <span className="text-[17px] tracking-[-0.02em] [font-weight:680]">
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
        <div className="flex items-center gap-3 max-[860px]:gap-3">
          <Btn
            href="/#work"
            variant="ghostLight"
            sm
            className="max-[1000px]:hidden"
          >
            See our latest work
          </Btn>
          <Btn href="/book" sm>
            Let{"’"}s Chat
          </Btn>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="hidden h-9 w-9 place-items-center max-[860px]:grid"
          >
            <span className="relative block h-3 w-[19px]">
              <i
                className={`absolute left-0 top-0 block h-[1.6px] w-full rounded-full bg-paper transition-transform duration-200 ${
                  open ? "translate-y-[5.2px] rotate-45" : ""
                }`}
              />
              <i
                className={`absolute left-0 top-[5.2px] block h-[1.6px] w-full rounded-full bg-paper transition-opacity duration-200 ${
                  open ? "opacity-0" : ""
                }`}
              />
              <i
                className={`absolute bottom-0 left-0 block h-[1.6px] w-full rounded-full bg-paper transition-transform duration-200 ${
                  open ? "-translate-y-[5.2px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] min-[861px]:hidden ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <nav className="overflow-hidden">
          <div className="flex flex-col border-t border-paper/10 px-4 pb-2 pt-1">
            <div className="pb-1.5 pt-3.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-accent-soft">
              {ENGINE_LABEL}
            </div>
            {PRODUCT_LINKS.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 border-b border-paper/10 py-2.5 text-[15px] font-medium text-paper/70"
              >
                <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] border border-paper/10 bg-paper/[0.04] text-paper/55">
                  <Icon paths={n.icon} />
                </span>
                {n.label}
              </a>
            ))}
            {LINKS.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="border-b border-paper/10 py-3 text-[15px] font-medium text-paper/70"
              >
                {n.label}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
