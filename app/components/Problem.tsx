import { DATA } from "@/app/data";
import { Eyebrow, SecTitle, Wrap } from "@/app/components/ui";

export default function Problem() {
  const p = DATA.problem;
  return (
    <section
      id="why"
      className="scroll-mt-[88px] border-y border-line bg-paper-2 py-[120px] max-[720px]:py-[78px]"
    >
      <Wrap>
        <div className="mx-auto mb-14 max-w-[760px] text-center">
          <Eyebrow>{p.eyebrow}</Eyebrow>
          <SecTitle>{p.title}</SecTitle>
        </div>
        <div className="grid grid-cols-4 gap-2.5 max-[1024px]:grid-cols-2 max-[600px]:grid-cols-1">
          {p.pain.map((x, i) => (
            <div
              key={i}
              className="flex flex-col gap-3.5 rounded-[22px] border border-line bg-card p-[30px] transition-[translate,box-shadow] duration-[250ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1 hover:shadow-[0_30px_52px_-34px_rgba(28,24,19,0.42)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs tracking-[0.16em] text-muted">
                  {"0" + (i + 1)}
                </span>
                <span className="rounded-full bg-accent-tint px-[11px] py-[5px] font-mono text-[11px] tracking-[0.03em] text-accent-deep">
                  {x.tag}
                </span>
              </div>
              <h4 className="font-serif text-[clamp(19px,2.1vw,22px)] tracking-[-0.015em] [font-weight:460]">
                {x.k}
              </h4>
              <p className="text-[14.5px] leading-[1.58] text-ink-soft">{x.v}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-[66px] flex max-w-[800px] flex-col items-center gap-[22px] text-center">
          <Eyebrow className="justify-center">{p.beliefLabel}</Eyebrow>
          <h3 className="font-serif text-[clamp(24px,3vw,36px)] leading-[1.3] tracking-[-0.02em] [font-weight:460]">
            The lack of deeper,{" "}
            <em className="text-accent">personalized discipleship.</em>
          </h3>
        </div>
      </Wrap>
    </section>
  );
}
