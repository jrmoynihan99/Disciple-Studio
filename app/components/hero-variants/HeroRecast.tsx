"use client";

import { DATA } from "@/app/data";
import { Arrow, Btn, Eyebrow, Wrap } from "@/app/components/ui";
import { HeroDevices } from "@/app/components/Hero";

export default function HeroRecast() {
  const h = DATA.hero;
  const mobileBtn = "max-[920px]:px-[18px] max-[920px]:py-3 max-[920px]:text-sm";
  return (
    <section
      id="top"
      className="relative scroll-mt-[88px] overflow-hidden pt-[130px] max-[920px]:pt-[90px]"
    >
      <Wrap className="grid min-h-[78vh] grid-cols-[1.05fr_0.95fr] items-center gap-14 pb-[60px] max-[920px]:min-h-0 max-[920px]:grid-cols-1 max-[920px]:gap-9 max-[920px]:pt-2.5">
        <div>
          <Eyebrow>Two disciples serving the local church</Eyebrow>
          <h1 className="mt-[22px] font-serif text-[clamp(42px,6vw,72px)] leading-[1.04] tracking-[-0.03em] [font-weight:460]">
            <span>We build websites that help churches</span>
            <span className="italic">
              <em className="text-accent"> make disciples.</em>
            </span>
          </h1>
          <p className="mt-[26px] max-w-[30em] text-[clamp(17px,1.7vw,20px)] leading-[1.55] text-ink-soft">
            We&rsquo;re Jason and Arjun. We met at our church, saw how little
            church websites did to help anyone follow Jesus, and started
            building ones that do.
          </p>
          <p className="mt-4 font-serif text-[16px] italic text-ink-soft">
            — Jason &amp; Arjun, Aletheia Church
          </p>
          <div className="mt-[30px] flex flex-wrap gap-3.5 max-[920px]:flex-nowrap">
            <Btn href="/book" className={mobileBtn}>
              {h.primary} <Arrow />
            </Btn>
            <Btn
              variant="ghost"
              href={DATA.demoUrl}
              target="_blank"
              rel="noreferrer"
              className={mobileBtn}
            >
              &#9654; {h.secondary}
            </Btn>
          </div>
        </div>
        <div className="max-[920px]:order-2">
          <HeroDevices />
        </div>
      </Wrap>
    </section>
  );
}
