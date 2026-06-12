import { DATA } from "@/app/data";
import { Arrow, Btn, Eyebrow, SecTitle, Wrap } from "@/app/components/ui";

type Group = {
  label: string;
  note: string;
  rows: { k: string; v: string }[];
};

function PriceGroup({ g }: { g: Group }) {
  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-line pb-2.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          {g.label}
        </span>
        <span className="font-mono text-[10.5px] text-muted">{g.note}</span>
      </div>
      {g.rows.map((r, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 border-b border-line py-[15px] text-[15.5px] last:border-b-0"
        >
          <span>{r.k}</span>
          <span className="font-semibold text-ink-soft">{r.v}</span>
        </div>
      ))}
    </div>
  );
}

export default function Pricing() {
  const p = DATA.pricing;
  return (
    <section
      id="pricing"
      className="scroll-mt-[88px] py-[120px] max-[720px]:py-[78px]"
    >
      <Wrap>
        <div className="grid grid-cols-2 gap-[50px] rounded-[22px] border border-line bg-card p-[52px] max-[820px]:grid-cols-1 max-[820px]:gap-8 max-[820px]:p-8">
          <div>
            <Eyebrow>{p.eyebrow}</Eyebrow>
            <SecTitle className="whitespace-pre-line">{p.title}</SecTitle>
            <p className="mb-[30px] mt-5 text-[17px] leading-[1.6] text-ink-soft">
              {p.sub}
            </p>
            <Btn href="/book">
              Let{"’"}s Chat <Arrow />
            </Btn>
            <p className="mt-5 font-mono text-[11.5px] tracking-[0.04em] text-muted">
              {p.note}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-10">
            <PriceGroup g={p.build} />
            <PriceGroup g={p.partnership} />
          </div>
        </div>
      </Wrap>
    </section>
  );
}
