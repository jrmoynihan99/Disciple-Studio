import Image from "next/image";
import { Btn, Arrow } from "@/components/ui";
import { Glow, Kicker } from "@/app/(site)/components/ui";
import { Wrap } from "@/components/ui";
import SectionReveal from "@/components/reveal-animations/SectionReveal";
import Reveal from "@/components/reveal-animations/Reveal";
import HeadingReveal from "@/components/reveal-animations/HeadingReveal";
import ParagraphReveal from "@/components/reveal-animations/ParagraphReveal";
import SubheadingReveal from "@/components/reveal-animations/SubheadingReveal";

const FOUNDERS = [
  {
    name: "Jason",
    role: "Design & Engineering",
    photo: "/jason.jpg",
    bio: "Hey! I came to saving faith in 2024. I spearhead the design and engineering of the websites. I love leveraging software for the Glory of God and the furthering of his Kingdom!",
  },
  {
    name: "Arjun",
    role: "Relationships",
    photo: "/arjun.jpg",
    bio: "Software Engineer turned Day Trader and by grace now a campus minister in the Boston area. Passionate about Jesus and helping churches reach the lost and disciple others better.",
  },
];

export default function About() {
  return (
    <section id="about" className="relative scroll-mt-[88px] overflow-hidden pb-[150px] pt-[130px] max-[920px]:pb-24 max-[920px]:pt-20">
      <SectionReveal>
        <Wrap className="grid grid-cols-[0.9fr_1.1fr] items-center gap-20 max-[980px]:grid-cols-1 max-[980px]:gap-12">
          <div className="relative max-[980px]:text-center">
            <Glow className="left-1/2 top-[-170px] h-[560px] w-[880px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(187,74,35,0.18),rgba(187,74,35,0.05)_55%,transparent_78%)]" />
            <div className="relative">
              <SubheadingReveal delay={0.4}>
                <Kicker>06 // Who we are</Kicker>
              </SubheadingReveal>
              <HeadingReveal
                as="h2"
                className="mt-5 font-serif text-[clamp(32px,3.5vw,46px)] leading-[1.06] tracking-[-0.025em] [font-weight:460]"
              >
                {"Two disciples\nserving the church."}
              </HeadingReveal>
              <ParagraphReveal
                delay={0.5}
                className="mt-5 max-w-[24em] text-[16.5px] leading-[1.6] text-paper/60 max-[980px]:mx-auto"
              >
                We’re on a mission to further God’s kingdom by helping churches
                better welcome and disciple the world.
              </ParagraphReveal>
              <Reveal delay={0.65} className="mt-7">
                <Btn href="/about-us">
                  More About Us <Arrow />
                </Btn>
              </Reveal>
            </div>
          </div>
          <div className="flex flex-col gap-9">
            {FOUNDERS.map((f, i) => (
              <Reveal key={f.name} delay={0.25 + i * 0.15}>
                {/* Stays side-by-side all the way down — photo left, copy
                    right — so the two founders read as a tight pair rather
                    than four stacked blocks on a phone. */}
                <div className="grid grid-cols-[116px_1fr] items-center gap-[22px] max-[720px]:grid-cols-[96px_1fr] max-[720px]:gap-4 max-[720px]:text-left">
                  <Image
                    src={f.photo}
                    alt={f.name}
                    width={116}
                    height={138}
                    className="block h-[138px] w-[116px] rounded-2xl border border-paper/[0.12] object-cover max-[720px]:h-[114px] max-[720px]:w-[96px]"
                  />
                  <div>
                    <div className="font-serif text-[23px]">{f.name}</div>
                    <div className="mb-[9px] mt-[3px] font-mono text-[10.5px] uppercase tracking-[0.1em] text-accent-soft">
                      {f.role}
                    </div>
                    <p className="text-[14.5px] leading-[1.55] text-paper/60">
                      {f.bio}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Wrap>
      </SectionReveal>
    </section>
  );
}
