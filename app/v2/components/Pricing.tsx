import Link from "next/link";
import { V2 } from "@/app/v2/data";
import { Kicker, Tape, Taped, nkBtn } from "@/app/v2/components/ui";

function PriceGroup({
  g,
}: {
  g: { label: string; note: string; rows: [string, string][] };
}) {
  return (
    <div className="pb-2.5 pt-1">
      <div className="flex items-baseline justify-between border-b-2 border-nb-ink/30 pb-1.5 pt-2">
        <span className="font-nb-hand text-[25px] text-nb-red">
          {g.label.toLowerCase()}
        </span>
        <span className="text-[13px] italic text-nb-faded">{g.note}</span>
      </div>
      {g.rows.map((r, i) => (
        <div
          key={i}
          className="flex items-center justify-between border-b-2 border-dotted border-nb-ink/22 py-[13px] text-[15.5px] last:border-b-0"
        >
          <span>{r[0]}</span>
          <b className="font-nb-hand text-[22px] font-semibold text-nb-green">
            {r[1]}
          </b>
        </div>
      ))}
    </div>
  );
}

export default function Pricing() {
  const p = V2.pricing;
  return (
    <section className="pt-[104px]">
      <div className="mx-auto grid max-w-[980px] grid-cols-[1fr_1.1fr] items-start gap-11 px-12 max-md:grid-cols-1 max-md:px-6">
        <div>
          <Kicker>{p.eyebrow}</Kicker>
          <h2 className="mb-3.5 mt-1.5 text-[34px] font-semibold leading-[1.2]">
            {p.title}
          </h2>
          <p className="text-base text-nb-muted">{p.sub}</p>
          <div className="mt-6">
            <Link className={nkBtn} href={V2.nav.talk.href}>
              {V2.nav.talk.label} →
            </Link>
          </div>
          <p className="mt-4 text-[13.5px] italic text-nb-faded">{p.note}</p>
        </div>
        <Taped className="px-[26px] py-2">
          <Tape />
          <PriceGroup g={p.build} />
          <div className="h-5" />
          <PriceGroup g={p.partnership} />
        </Taped>
      </div>
    </section>
  );
}
