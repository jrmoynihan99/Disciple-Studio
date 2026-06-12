"use client";

import Link from "next/link";
import { V2 } from "@/app/v2/data";
import { useChurchName } from "@/app/v2/church-name";
import { Hl, SectionHead, Tape, Taped, nkBtn } from "@/app/v2/components/ui";

export default function Offer() {
  const o = V2.offer;
  const { name } = useChurchName();
  const who = name.trim() || "you";
  return (
    <section className="pt-[104px]">
      <div className="mx-auto max-w-[980px] px-12 max-md:px-5">
        <SectionHead
          kicker={o.eyebrow}
          title={
            <>
              {o.title} <Hl>{who}</Hl>.
            </>
          }
          sub={o.sub}
        />
        <div className="mx-auto grid max-w-[880px] grid-cols-2 gap-x-[26px] gap-y-[30px] max-md:grid-cols-1">
          {o.items.map((f, i) => (
            <Taped
              key={i}
              alt={i % 2 === 1}
              className="flex flex-col gap-2.5 p-[26px]"
            >
              <Tape />
              <span className="font-nb-hand text-[23px] text-nb-tan">
                {f.tag}
              </span>
              <h3 className="text-[28px] font-semibold leading-[1.3]">
                {f.title}
              </h3>
              <p className="text-[15px] text-nb-soft">{f.body}</p>
              {f.link && (
                <a
                  className="mt-[5px] inline-block w-fit -rotate-1 self-start border-b-2 border-nb-red/35 font-nb-hand text-[21px] leading-[1.2] text-nb-red"
                  href={V2.demos[f.link.demo].href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {f.link.label} →
                </a>
              )}
            </Taped>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <span className="-rotate-[1.2deg] font-nb-hand text-[23px] text-nb-red">
            {o.ctaNote} →
          </span>
          <Link className={nkBtn} href={V2.nav.talk.href}>
            {o.cta} →
          </Link>
        </div>
      </div>
    </section>
  );
}
