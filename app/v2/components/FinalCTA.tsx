"use client";

import Link from "next/link";
import { V2 } from "@/app/v2/data";
import { useChurchName } from "@/app/v2/church-name";
import { Kicker } from "@/app/v2/components/ui";

export default function FinalCTA() {
  const c = V2.cta;
  const { name } = useChurchName();
  return (
    <section className="mt-[104px] bg-nb-ink pb-[84px] pt-[88px] text-center text-nb-paper">
      <Kicker gold>chapter one — {name.trim() || "your church"}</Kicker>
      <h2 className="mx-auto mb-5 mt-2 max-w-[600px] text-balance px-5 text-[40px] font-semibold leading-[1.2] text-nb-paper max-md:text-3xl">
        {c.title}
      </h2>
      <p className="mx-auto mb-[34px] max-w-[520px] text-pretty px-6 text-lg text-nb-dark-muted">
        {c.sub}
      </p>
      <Link
        className="inline-block rounded-md bg-nb-hl px-8 py-[15px] text-[17.5px] font-semibold text-nb-ink shadow-[4px_4px_0_rgba(0,0,0,0.28)]"
        href={V2.nav.talk.href}
      >
        {c.primary}
      </Link>
      <p className="mt-[22px] font-nb-hand text-2xl text-nb-gold">
        <a href={V2.demoUrl} target="_blank" rel="noreferrer">
          {c.secondary} →
        </a>
      </p>
    </section>
  );
}
