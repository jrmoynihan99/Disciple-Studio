"use client";

import { useEffect, useState } from "react";
import { DATA } from "@/app/data";
import { Btn } from "@/app/components/ui";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[100] border-b transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-line bg-[rgba(244,240,232,0.82)] backdrop-blur-[14px]"
          : "border-transparent max-[920px]:border-line max-[920px]:bg-paper"
      }`}
    >
      <div className="flex h-[70px] items-center justify-between px-12 max-[920px]:h-[52px] max-[920px]:px-4">
        <a className="inline-flex items-center gap-2.5" href="/">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-[15px] text-white">
            {"✝"}
          </span>
          <span className="text-[17px] tracking-[-0.02em] [font-weight:680]">
            Disciple Studio
          </span>
        </a>
        <nav className="flex gap-[30px] max-[860px]:hidden">
          {DATA.nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-[14.5px] font-medium text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-[18px] max-[860px]:gap-3">
          <a
            href={DATA.demoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[14.5px] [font-weight:560] hover:text-accent max-[860px]:hidden"
          >
            Our Latest Work
          </a>
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
                className={`absolute left-0 top-0 block h-[1.6px] w-full rounded-full bg-ink transition-transform duration-200 ${
                  open ? "translate-y-[5.2px] rotate-45" : ""
                }`}
              />
              <i
                className={`absolute left-0 top-[5.2px] block h-[1.6px] w-full rounded-full bg-ink transition-opacity duration-200 ${
                  open ? "opacity-0" : ""
                }`}
              />
              <i
                className={`absolute bottom-0 left-0 block h-[1.6px] w-full rounded-full bg-ink transition-transform duration-200 ${
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
          <div className="flex flex-col border-t border-line px-4 pb-2 pt-1">
            {DATA.nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-3 text-[15px] font-medium text-ink-soft"
              >
                {n.label}
              </a>
            ))}
            <a
              href={DATA.demoUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="py-3 text-[15px] [font-weight:560]"
            >
              Our Latest Work <span className="text-accent">{"↗"}</span>
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
