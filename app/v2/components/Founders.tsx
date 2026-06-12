import Link from "next/link";
import { V2 } from "@/app/v2/data";
import {
  ImageSlot,
  SectionHead,
  Tape,
  nkCtaBtn,
} from "@/app/v2/components/ui";

export default function Founders() {
  const f = V2.founders;
  return (
    <section className="pt-[104px]">
      <SectionHead kicker={f.eyebrow} title={f.title} />
      <div className="mx-auto grid max-w-[820px] grid-cols-2 gap-12 px-10 max-md:grid-cols-1 max-md:px-8">
        {f.people.map((p, i) => (
          <div key={i} className="text-center">
            <div
              className={`relative mb-5 border border-nb-border bg-nb-card px-3.5 pb-4 pt-3.5 shadow-[0_4px_16px_rgba(91,74,50,0.15)] ${
                i % 2 === 1 ? "rotate-[1.2deg]" : "-rotate-[1.4deg]"
              }`}
            >
              <Tape />
              <ImageSlot label={`photo of ${p.name}`} className="h-[340px] w-full" />
            </div>
            <b className="block font-nb-hand text-[34px] font-semibold">
              {p.name}
            </b>
            <div className="mb-2.5 mt-0.5 text-sm italic text-nb-faded">
              {p.role}
            </div>
            <p className="text-left text-[15.5px] text-nb-soft">{p.bio}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Link className={nkCtaBtn} href={f.cta.href}>
          {f.cta.label} →
        </Link>
      </div>
    </section>
  );
}
