import Image from "next/image";
import { DATA } from "@/app/data";
import { Wrap } from "@/components/ui";
import { SectionHead } from "@/app/(site)/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import { withLinks } from "./links";

export default function Team() {
  const b = DATA.aboutUs.bios;
  return (
    <section className="relative px-6 py-[120px] max-[920px]:py-20">
      <Wrap className="relative">
        <SectionReveal>
          <SectionHead animate kicker={b.eyebrow} title={b.title} />
          <div className="mt-16 grid grid-cols-2 gap-12 max-[860px]:mx-auto max-[860px]:max-w-[560px] max-[860px]:grid-cols-1">
            {b.people.map((person, i) => (
              <Reveal key={person.name} delay={0.25 + i * 0.15} className="flex flex-col">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-paper/10 bg-[#1f1a14]">
                <Image
                  src={person.photo}
                  alt={`Photo of ${person.name}`}
                  fill
                  sizes="(max-width: 860px) 100vw, 620px"
                  className="object-cover"
                />
              </div>
              <div className="pt-7">
                <div className="font-serif text-[clamp(24px,2.5vw,30px)]">
                  {person.name}
                </div>
                <div className="mb-5 mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-accent-soft">
                  {person.role}
                </div>
                {person.paragraphs.map((p, j) => (
                  <p
                    key={j}
                    className={`text-[15px] leading-[1.65] text-paper/65 ${
                      j > 0 ? "mt-3.5" : ""
                    }`}
                  >
                    {withLinks(p)}
                  </p>
                ))}
                {person.verse && (
                  <blockquote className="mt-7 flex flex-col gap-2 rounded-r-[9px] border-l-[3px] border-accent bg-accent/[0.08] px-6 py-5">
                    <span className="font-serif text-[15px] italic leading-[1.55] text-paper/75">
                      {"“"}
                      {person.verse.text}
                      {"”"}
                    </span>
                    <cite className="font-mono text-[11px] uppercase not-italic tracking-[0.1em] text-accent-soft">
                      {person.verse.ref}
                    </cite>
                  </blockquote>
                )}
              </div>
              </Reveal>
            ))}
          </div>
        </SectionReveal>
      </Wrap>
    </section>
  );
}
