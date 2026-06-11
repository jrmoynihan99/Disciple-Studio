import { DATA } from "@/app/data";
import { Arrow, Btn, Wrap } from "@/app/components/ui";

export default function FinalCTA() {
  const c = DATA.finalCta;
  return (
    <section
      id="book"
      className="scroll-mt-[88px] bg-ink py-[120px] text-center text-paper"
    >
      <Wrap>
        <h2 className="font-serif text-[clamp(34px,5.5vw,64px)] leading-[1.02] tracking-[-0.03em] [font-weight:460]">
          {c.title[0]}
          <br />
          <span className="italic">{c.title[1]}</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[34em] text-[18px] leading-[1.55] text-paper/72">
          {c.sub}
        </p>
        <div className="mt-[38px] flex flex-wrap justify-center gap-3.5">
          <Btn href="/book">
            {c.primary} <Arrow />
          </Btn>
          <Btn
            variant="ghostLight"
            href="https://aletheia-website-seven.vercel.app/demo?k=a557d77fe749fddba7b92e37"
          >
            &#9654; {c.secondary}
          </Btn>
        </div>
      </Wrap>
    </section>
  );
}
