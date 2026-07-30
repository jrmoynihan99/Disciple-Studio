import Image from "next/image";
import { DATA } from "@/app/data";
import { Eyebrow, SecTitle, Wrap } from "@/components/ui";

export default function Problem() {
  const p = DATA.problem;
  return (
    <section
      id="why"
      className="scroll-mt-[88px] border-y border-line bg-paper-2 py-[120px] max-[720px]:py-[78px]"
    >
      <Wrap>
        <div className="grid grid-cols-[0.9fr_1.1fr] items-center gap-16 max-[900px]:grid-cols-1 max-[900px]:gap-10">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-line shadow-[0_30px_50px_-34px_rgba(28,24,19,0.4)] max-[900px]:order-2 max-[900px]:mx-auto max-[900px]:w-full max-[900px]:max-w-[520px]">
            <Image
              src="/laptop.jpg"
              alt="Jason and Arjun looking at a church website together"
              fill
              sizes="(max-width: 900px) 520px, 48vw"
              className="object-cover"
            />
          </div>
          <div>
            <Eyebrow>{p.eyebrow}</Eyebrow>
            <SecTitle>
              {p.title} <em className="italic text-accent">{p.titleEm}</em>
            </SecTitle>
            <div className="mt-6 flex max-w-[36em] flex-col gap-4 text-[17px] leading-[1.65] text-ink-soft">
              {p.body.map((t, i) => (
                <p key={i}>{t}</p>
              ))}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-[72px] flex max-w-[800px] flex-col items-center gap-[22px] text-center">
          <h3 className="font-serif text-[clamp(24px,3vw,36px)] leading-[1.3] tracking-[-0.02em] [font-weight:460]">
            {p.beliefLead} <em className="text-accent">{p.beliefHighlight}</em>
          </h3>
        </div>
      </Wrap>
    </section>
  );
}
