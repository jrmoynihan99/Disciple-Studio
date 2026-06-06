"use client";

import { useEffect, useState } from "react";
import { DATA } from "@/app/data";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header className={"nav" + (scrolled ? " stuck" : "")}>
      <div className="nav-in">
        <a className="brand" href="#top">
          <span className="brand-mark">{"\u271D"}</span>
          <span className="brand-name">Disciple Studio</span>
        </a>
        <nav className="nav-links">
          {DATA.nav.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="nav-cta">
          <a href="#showcase" className="nav-demo">
            Our Latest Work
          </a>
          <a href="#book" className="btn btn-primary btn-sm">
            Book a call
          </a>
        </div>
      </div>
    </header>
  );
}
