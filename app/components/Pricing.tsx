"use client";

import { useState, useEffect, useRef } from "react";
import { DATA } from "@/app/data";

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

function CostCompare({ on }: { on: boolean }) {
  const [month, setMonth] = useState(0);
  useEffect(() => {
    if (!on) {
      setMonth(0);
      return;
    }
    setMonth(0);
    let m = 0;
    const t = setInterval(() => {
      m = m >= 12 ? 0 : m + 1;
      setMonth(m);
    }, 480);
    return () => clearInterval(t);
  }, [on]);
  const perMo = 199;
  const theirs = month * perMo;
  return (
    <div className="cost-compare">
      <div className="free-row">
        <div className="free-side">
          <div className="free-label">Typical platform</div>
          <div className="free-amt their">${theirs.toLocaleString()}</div>
          <div className="free-sub mono">
            ${perMo}/mo &middot; month {month}
          </div>
          <div className="free-bar">
            <div
              className="free-fill their"
              style={{ width: (month / 12) * 100 + "%" }}
            />
          </div>
        </div>
        <div className="free-side">
          <div className="free-label">Disciple Studio</div>
          <div className="free-amt ours">$0</div>
          <div className="free-sub mono">built once, owned forever</div>
          <div className="free-bar">
            <div className="free-fill ours" style={{ width: "3%" }} />
          </div>
        </div>
      </div>
      <div className="free-stamp serif">
        That&rsquo;s ${(perMo * 12).toLocaleString()}/yr back in the ministry.
      </div>
    </div>
  );
}

export default function Pricing() {
  const p = DATA.pricing;
  const [ref, inView] = useInView();
  return (
    <section id="pricing" className="pricing-sec section-pad" ref={ref}>
      <div className="wrap">
        <div className="pricing-card">
          <div className="pricing-left">
            <span className="eyebrow">{p.eyebrow}</span>
            <h2 className="sec-title">{p.title}</h2>
            <p className="pricing-sub">{p.sub}</p>
            <a href="#book" className="btn btn-primary pricing-cta">
              Book a call <span className="arrow">&rarr;</span>
            </a>
            <CostCompare on={inView} />
          </div>
          <div className="pricing-right">
            {p.rows.map((r, i) => (
              <div key={i} className="price-row">
                <span>{r.k}</span>
                <span className={`price-v${r.v === "$0" ? " zero" : ""}`}>{r.v}</span>
              </div>
            ))}
            <div className="pricing-divider" />
          </div>
        </div>
      </div>
    </section>
  );
}
