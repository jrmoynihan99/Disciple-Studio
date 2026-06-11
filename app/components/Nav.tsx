"use client";

import { useEffect, useState } from "react";
import { DATA } from "@/app/data";
import { Btn } from "@/app/components/ui";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

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
        <div className="flex items-center gap-[18px]">
          <a
            href="https://aletheia-website-seven.vercel.app/demo?k=a557d77fe749fddba7b92e37"
            target="_blank"
            rel="noreferrer"
            className="text-[14.5px] [font-weight:560] hover:text-accent max-[860px]:hidden"
          >
            Our Latest Work
          </a>
          <Btn href="/book" sm>
            Book a call
          </Btn>
        </div>
      </div>
    </header>
  );
}
