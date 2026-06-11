import Nav from "@/app/components/Nav";
import Footer from "@/app/components/Footer";
import { DATA } from "@/app/data";
import type { Metadata } from "next";
import { Arrow, Btn, Eyebrow, SecTitle, Wrap } from "@/app/components/ui";

export const metadata: Metadata = {
  title: "About Us — Disciple Studio",
  description:
    "Meet Jason and Arjun — two disciples building custom websites for the local church.",
};

const STRIPES =
  "bg-[repeating-linear-gradient(45deg,var(--color-paper-2),var(--color-paper-2)_9px,var(--color-paper-3)_9px,var(--color-paper-3)_18px)]";

export default function AboutUs() {
  const a = DATA.aboutUs;
  return (
    <>
      <Nav />
      <main>
        {/* Our Story */}
        <section className="pb-[120px] pt-[160px] max-[720px]:pb-[78px] max-[600px]:pt-[120px]">
          <Wrap>
            <div className="grid grid-cols-[1.1fr_0.9fr] items-center gap-[60px] max-[940px]:grid-cols-1 max-[940px]:gap-10">
              <div>
                <Eyebrow>{a.story.eyebrow}</Eyebrow>
                <h1 className="mt-[18px] font-serif text-[clamp(36px,5vw,56px)] leading-[1.04] tracking-[-0.025em] [font-weight:460]">
                  {a.story.title}
                </h1>
                <div className="mt-8 flex flex-col gap-5">
                  {a.story.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="text-[18px] leading-[1.65] text-ink-soft"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
              <div
                className={`grid aspect-[4/5] place-items-center rounded-[22px] max-[940px]:mx-auto max-[940px]:max-w-[400px] ${STRIPES}`}
              >
                <span className="font-mono text-xs tracking-[0.05em] text-muted">
                  photo
                </span>
              </div>
            </div>
          </Wrap>
        </section>

        {/* Mission & Values */}
        <section className="border-y border-line bg-paper-2 py-[120px] max-[720px]:py-[78px]">
          <Wrap>
            <div className="mx-auto mb-14 max-w-[760px] text-center">
              <Eyebrow>{a.mission.eyebrow}</Eyebrow>
              <SecTitle>{a.mission.title}</SecTitle>
              <p className="mx-auto mt-[22px] max-w-[640px] text-[17px] leading-[1.6] text-ink-soft">
                {a.mission.intro}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3.5 max-[600px]:grid-cols-1">
              {a.mission.values.map((v, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3.5 rounded-[22px] border border-line bg-card p-[30px] transition-[translate,box-shadow] duration-[250ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1 hover:shadow-[0_30px_52px_-34px_rgba(28,24,19,0.42)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs tracking-[0.16em] text-muted">
                      {"0" + (i + 1)}
                    </span>
                    <span className="rounded-full bg-accent-tint px-[11px] py-[5px] font-mono text-[11px] tracking-[0.03em] text-accent-deep">
                      {v.label}
                    </span>
                  </div>
                  <h3 className="font-serif text-[clamp(19px,2.1vw,22px)] tracking-[-0.015em] [font-weight:460]">
                    {v.label}
                  </h3>
                  <p className="text-[14.5px] leading-[1.58] text-ink-soft">
                    {v.body}
                  </p>
                </div>
              ))}
            </div>
          </Wrap>
        </section>

        {/* Deep Bios */}
        <section className="py-[120px] max-[720px]:py-[78px]">
          <Wrap>
            <div className="mx-auto mb-14 max-w-[760px] text-center">
              <Eyebrow>{a.bios.eyebrow}</Eyebrow>
              <SecTitle>{a.bios.title}</SecTitle>
            </div>
            <div className="mt-16 grid grid-cols-2 gap-8 max-[860px]:mx-auto max-[860px]:max-w-[560px] max-[860px]:grid-cols-1">
              {a.bios.people.map((person, i) => (
                <div key={i} className="flex flex-col">
                  <div className="relative grid aspect-[3/2] place-items-center overflow-hidden rounded-[22px] bg-paper-3">
                    <div className="flex h-full w-full items-end justify-center bg-[linear-gradient(180deg,var(--color-paper-2)_0%,var(--color-paper-3)_100%)]">
                      <svg
                        viewBox="0 0 120 140"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-[45%] text-ink/8"
                      >
                        <circle cx="60" cy="40" r="28" fill="currentColor" />
                        <ellipse
                          cx="60"
                          cy="130"
                          rx="48"
                          ry="42"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="pt-7">
                    <div className="font-serif text-[clamp(24px,2.5vw,30px)]">
                      {person.name}
                    </div>
                    <div className="mb-5 mt-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                      {person.role}
                    </div>
                    {person.paragraphs.map((p, j) => (
                      <p
                        key={j}
                        className={`text-[15px] leading-[1.65] text-ink-soft ${
                          j > 0 ? "mt-3.5" : ""
                        }`}
                      >
                        {p}
                      </p>
                    ))}
                    {person.verse && (
                      <blockquote className="mt-7 flex flex-col gap-2 rounded-r-[9px] border-l-[3px] border-accent bg-paper-2 px-6 py-5">
                        <span className="font-serif text-[15px] italic leading-[1.55] text-ink-soft">
                          {"“"}
                          {person.verse.text}
                          {"”"}
                        </span>
                        <cite className="font-mono text-[11px] uppercase not-italic tracking-[0.08em] text-accent">
                          {person.verse.ref}
                        </cite>
                      </blockquote>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Wrap>
        </section>

        {/* CTA */}
        <section className="bg-ink py-[120px] text-center text-paper">
          <Wrap>
            <h2 className="font-serif text-[clamp(34px,5.5vw,64px)] leading-[1.02] tracking-[-0.03em] [font-weight:460]">
              {a.cta.title[0]}
              <br />
              <span className="italic">{a.cta.title[1]}</span>
            </h2>
            <p className="mx-auto mt-6 max-w-[34em] text-[18px] leading-[1.55] text-paper/72">
              {a.cta.sub}
            </p>
            <div className="mt-[38px] flex flex-wrap justify-center gap-3.5">
              <Btn href="/book">
                {a.cta.primary} <Arrow>{"→"}</Arrow>
              </Btn>
              <Btn variant="ghostLight" href="/">
                {"←"} {a.cta.secondary}
              </Btn>
            </div>
          </Wrap>
        </section>
      </main>
      <Footer />
    </>
  );
}
