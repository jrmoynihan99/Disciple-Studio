import Link from "next/link";
import { V2 } from "@/app/v2/data";
import { Hl, Kicker, nkBtn, nkGhost } from "@/app/v2/components/ui";

export default function Hero() {
  const h = V2.hero;
  return (
    <header className="pt-[90px] text-center max-md:pt-16">
      <Kicker>{h.kicker}</Kicker>
      <h1 className="mx-auto mb-[26px] mt-[18px] max-w-[780px] text-balance text-[52px] font-semibold leading-[1.18] tracking-[-0.01em] max-md:px-5 max-md:text-4xl">
        {h.title}
        <Hl>{h.titleAccent}</Hl>
      </h1>
      <p className="mx-auto mb-[34px] max-w-[540px] text-pretty text-[19px] text-nb-muted max-md:px-6">
        {h.sub}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 px-5">
        <Link className={nkBtn} href={V2.nav.talk.href}>
          {h.primary}
        </Link>
        <a className={nkGhost} href={V2.demoUrl} target="_blank" rel="noreferrer">
          {h.secondary}
        </a>
      </div>
      <div>
        <a
          className="mt-10 inline-block -rotate-[1.5deg] px-6 font-nb-hand text-[27px] text-nb-red"
          href="#chapter-1"
        >
          {h.hook} ↓
        </a>
      </div>
    </header>
  );
}
