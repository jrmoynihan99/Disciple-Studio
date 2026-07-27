import { DATA } from "@/app/data";
import { Wrap } from "@/components/ui";
import { Glow, SectionHead } from "@/app/(site)/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";

export default function Values() {
  const m = DATA.aboutUs.mission;
  return (
    <section className="relative px-6 py-[120px] max-[920px]:py-20">
      <Glow className="left-1/2 top-[-120px] h-[560px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.16),rgba(187,74,35,0.05)_55%,transparent_78%)]" />
      <Wrap className="relative">
        <SectionReveal>
          <SectionHead
            animate
            kicker={m.eyebrow}
            title={m.title}
            sub={m.intro}
            subClassName="max-w-[36em]"
          />
        </SectionReveal>
        <div className="mx-auto mt-16 grid max-w-[1000px] grid-cols-2 gap-5 max-[860px]:grid-cols-1">
          {m.values.map((v, i) => (
            <Reveal key={v.label} delay={(i % 2) * 0.12}>
              <div className="h-full rounded-[20px] border border-paper/10 bg-[#1f1a14] px-8 py-7 max-[720px]:px-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-accent font-mono text-[13px] font-semibold text-white">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-serif text-[23px] tracking-[-0.01em]">
                    {v.label}
                  </h3>
                </div>
                <p className="mt-4 text-[15px] leading-[1.65] text-paper/65">
                  {v.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Wrap>
    </section>
  );
}
