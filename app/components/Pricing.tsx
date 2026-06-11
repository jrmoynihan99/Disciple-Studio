"use client";

import { useState, useEffect, useRef } from "react";
import { DATA } from "@/app/data";
import { Arrow, Btn, Eyebrow, SecTitle, Wrap } from "@/app/components/ui";

function useInView() {
  const ref = useRef<HTMLElement>(null);
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
  const amt =
    "mb-1 mt-2 font-serif text-[clamp(24px,3vw,34px)] leading-none tracking-[-0.02em]";
  const bar = "mt-3 h-[7px] overflow-hidden rounded-full bg-card";
  const fill = "h-full rounded-full transition-[width] duration-[400ms] ease-linear";
  return (
    <div className="pt-10">
      <div className="grid grid-cols-2 gap-4 max-[940px]:grid-cols-1">
        <div className="rounded-xl bg-paper-2 p-[18px]">
          <div className="text-xs font-semibold text-ink-soft">
            Typical platform
          </div>
          <div className={`${amt} text-[#b5503a]`}>
            ${theirs.toLocaleString()}
          </div>
          <div className="font-mono text-[10.5px] text-muted">
            ${perMo}/mo &middot; month {month}
          </div>
          <div className={bar}>
            <div
              className={`${fill} bg-[#b5503a]`}
              style={{ width: (month / 12) * 100 + "%" }}
            />
          </div>
        </div>
        <div className="rounded-xl bg-accent-tint p-[18px]">
          <div className="text-xs font-semibold text-ink-soft">
            Disciple Studio
          </div>
          <div className={`${amt} text-accent`}>$0</div>
          <div className="font-mono text-[10.5px] text-muted">
            built once, owned forever
          </div>
          <div className={bar}>
            <div className={`${fill} bg-accent`} style={{ width: "3%" }} />
          </div>
        </div>
      </div>
      <div className="mt-4 text-center font-serif text-[15px] leading-[1.25]">
        That&rsquo;s ${(perMo * 12).toLocaleString()}/yr back in the ministry.
      </div>
    </div>
  );
}

export default function Pricing() {
  const p = DATA.pricing;
  const [ref, inView] = useInView();
  return (
    <section
      id="pricing"
      className="scroll-mt-[88px] py-[120px] max-[720px]:py-[78px]"
      ref={ref}
    >
      <Wrap>
        <div className="grid grid-cols-2 gap-[50px] rounded-[22px] border border-line bg-card p-[52px] max-[820px]:grid-cols-1 max-[820px]:gap-8 max-[820px]:p-8">
          <div>
            <Eyebrow>{p.eyebrow}</Eyebrow>
            <SecTitle>{p.title}</SecTitle>
            <p className="mb-[30px] mt-5 text-[17px] leading-[1.55] text-ink-soft">
              {p.sub}
            </p>
            <Btn href="/book">
              Book a call <Arrow />
            </Btn>
            <CostCompare on={inView} />
          </div>
          <div className="flex flex-col justify-center">
            {p.rows.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-line py-4 text-[15.5px]"
              >
                <span>{r.k}</span>
                <span
                  className={
                    r.v === "$0"
                      ? "font-serif text-[22px] font-semibold text-accent"
                      : "font-semibold text-ink-soft"
                  }
                >
                  {r.v}
                </span>
              </div>
            ))}
            <div className="mb-1 h-px bg-line" />
          </div>
        </div>
      </Wrap>
    </section>
  );
}
