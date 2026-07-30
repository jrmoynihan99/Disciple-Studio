"use client";

import { DATA } from "@/app/data";
import { Arrow, Btn, Eyebrow, Wrap } from "@/components/ui";

const STRIPES =
  "bg-[repeating-linear-gradient(45deg,var(--color-paper-2),var(--color-paper-2)_10px,var(--color-paper-3)_10px,var(--color-paper-3)_20px)]";

function MiniSite({ mode }: { mode: "desktop" | "mobile" }) {
  const mobile = mode === "mobile";
  const padX = mobile ? "px-[11px]" : "px-3.5";
  const line = "rounded-[3px] bg-ink/18";
  const navBar = "block h-1 w-[22px] rounded-[2px] bg-line";
  return (
    <div className="bg-paper font-sans text-ink">
      <div className="flex items-center gap-2 border-b border-line bg-card px-3 py-[9px]">
        <b className="font-serif text-xs">Grace</b>
        {!mobile && (
          <span className="ml-3.5 flex gap-[7px]">
            <i className={navBar} />
            <i className={navBar} />
            <i className={navBar} />
          </span>
        )}
        <u className="ml-auto rounded-full bg-accent px-[9px] py-1 text-[9px] text-white no-underline">
          Give
        </u>
      </div>
      <div
        className={`relative flex flex-col gap-[7px] pb-5 pt-[22px] ${padX} ${STRIPES}`}
      >
        <div
          className={`font-serif leading-[1.05] ${mobile ? "text-[15px]" : "text-[19px]"}`}
        >
          You&rsquo;re welcome here.
        </div>
        <div className={`h-[5px] w-[72%] ${line}`} />
        <div className={`h-[5px] w-[46%] ${line}`} />
        <span className="mt-1.5 self-start rounded-full bg-ink px-[11px] py-1.5 text-[9px] text-paper">
          Plan your visit
        </span>
      </div>
      <div className={`py-4 ${padX}`}>
        <div className="mb-[9px] font-mono text-[8px] tracking-[0.12em] text-accent">
          THIS SUNDAY
        </div>
        <div className={`grid gap-2 ${mobile ? "grid-cols-2" : "grid-cols-3"}`}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-[5px] rounded-[7px] border border-line bg-card p-[7px]"
            >
              <div className="h-[38px] rounded-[5px] bg-paper-3" />
              <div className={`h-1 w-[72%] ${line}`} />
              <div className={`h-1 w-[46%] ${line}`} />
            </div>
          ))}
        </div>
      </div>
      <div className={`flex flex-col items-start gap-[9px] bg-ink py-4 ${padX}`}>
        <div className="font-serif text-[17px] leading-[1.05] text-paper">
          Find your people.
        </div>
        <span className="mt-1.5 self-start rounded-full bg-accent px-[11px] py-1.5 text-[9px] text-white">
          Explore groups
        </span>
      </div>
      <div className={`py-4 ${padX}`}>
        <div className="mb-[9px] font-mono text-[8px] tracking-[0.12em] text-accent">
          LATEST SERMON
        </div>
        <div className={`h-[78px] rounded-lg ${STRIPES}`} />
      </div>
      <div className="flex items-center justify-between border-t border-line bg-paper-2 p-3.5">
        <b className="font-serif text-xs">Grace</b>
        <span className="block h-1 w-[50px] rounded-[2px] bg-line" />
      </div>
    </div>
  );
}

export function HeroDevices() {
  return (
    <div className="relative pb-[30px] pt-2">
      <div className="relative ml-auto mr-6 w-full max-w-[462px] max-[920px]:max-w-[340px]">
        <div className="relative aspect-[16/10] rounded-t-2xl border border-b-0 border-[#2b2720] bg-[#100f0c] p-3 shadow-[0_34px_64px_-32px_rgba(28,24,19,0.55)]">
          <span className="absolute left-1/2 top-1.5 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#3a352b]" />
          <div className="absolute inset-3 overflow-hidden rounded-[5px] bg-paper">
            <div className="flex animate-lap-scroll flex-col">
              <MiniSite mode="desktop" />
              <MiniSite mode="desktop" />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-3 rounded-[5px] bg-[linear-gradient(118deg,rgba(255,255,255,0.13),rgba(255,255,255,0)_42%)]" />
        </div>
        <div className="relative ml-[-8%] h-[15px] w-[116%] rounded-b-[13px] bg-[linear-gradient(#d0c9b9,#b1a896)] shadow-[0_18px_28px_-16px_rgba(28,24,19,0.5)]">
          <span className="absolute left-1/2 top-0 h-1.5 w-[88px] -translate-x-1/2 rounded-b-lg bg-[#a69d8a]" />
        </div>
      </div>
      <div className="absolute bottom-[-16px] right-0 z-[3] w-40 rounded-3xl bg-[#0a0a08] p-1.5 shadow-[0_28px_46px_-18px_rgba(28,24,19,0.55)] max-[920px]:w-[100px]">
        <span className="absolute left-1/2 top-[11px] z-[4] h-2.5 w-11 -translate-x-1/2 rounded-full bg-[#0a0a08]" />
        <div className="relative aspect-[9/19] overflow-hidden rounded-[17px] bg-paper">
          <div className="flex animate-ph-scroll flex-col">
            <MiniSite mode="mobile" />
            <MiniSite mode="mobile" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const h = DATA.hero;
  const mobileBtn = "max-[920px]:px-[18px] max-[920px]:py-3 max-[920px]:text-sm";
  return (
    <section
      id="top"
      className="relative scroll-mt-[88px] overflow-hidden pt-[130px] max-[920px]:pt-[90px]"
    >
      <Wrap className="grid min-h-[78vh] grid-cols-[1.05fr_0.95fr] items-center gap-14 pb-[60px] max-[920px]:min-h-0 max-[920px]:grid-cols-1 max-[920px]:gap-9 max-[920px]:pt-2.5">
        <div>
          <Eyebrow>{h.kicker}</Eyebrow>
          <h1 className="mt-[22px] font-serif text-[clamp(42px,6vw,72px)] leading-[1.04] tracking-[-0.03em] [font-weight:460]">
            <span>Custom church websites built by disciples,</span>
            <span className="italic">
              <em className="text-accent"> to disciple.</em>
            </span>
          </h1>
          <p className="mt-[26px] max-w-[30em] text-[clamp(17px,1.7vw,20px)] leading-[1.55] text-ink-soft">
            {h.sub}
          </p>
          <div className="mt-[34px] flex flex-wrap gap-3.5 max-[920px]:flex-nowrap">
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
          {/* <div className="mt-[34px] flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-[7px] rounded-full bg-card px-3 py-1.5 font-mono text-xs tracking-[0.04em] text-ink-soft shadow-[inset_0_0_0_1px_var(--color-line)]">
              <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-accent" /> Welcomes new guests
            </span>
            <span className="inline-flex items-center gap-[7px] rounded-full bg-card px-3 py-1.5 font-mono text-xs tracking-[0.04em] text-ink-soft shadow-[inset_0_0_0_1px_var(--color-line)]">Disciples your members</span>
            <span className="inline-flex items-center gap-[7px] rounded-full bg-card px-3 py-1.5 font-mono text-xs tracking-[0.04em] text-ink-soft shadow-[inset_0_0_0_1px_var(--color-line)]">No monthly fees</span>
          </div>*/}
        </div>
        <div className="max-[920px]:order-2">
          <HeroDevices />
        </div>
      </Wrap>
    </section>
  );
}
