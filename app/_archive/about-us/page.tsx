import Nav from "@/app/_archive/components/Nav";
import Footer from "@/app/_archive/components/Footer";
import Image from "next/image";
import { DATA } from "@/app/data";
import type { Metadata } from "next";
import { Arrow, Btn, Eyebrow, SecTitle, Wrap } from "@/components/ui";

export const metadata: Metadata = {
  title: "About Us — Disciple Studio",
  description:
    "Meet Jason and Arjun — two disciples building custom websites for the local church.",
};

/* renders [label](url) spans in copy strings as links */
function withLinks(text: string) {
  return text.split(/(\[[^\]]+\]\([^)\s]+\))/g).map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (!m) return part;
    return (
      <a
        key={i}
        href={m[2]}
        target="_blank"
        rel="noreferrer"
        className="text-accent underline underline-offset-[3px] transition-opacity hover:opacity-75"
      >
        {m[1]}
      </a>
    );
  });
}

export default function AboutUs() {
  const a = DATA.aboutUs;
  return (
    <>
      <Nav />
      <main>
        {/* Our Story */}
        <section className="pb-[120px] pt-[160px] max-[720px]:pb-[78px] max-[600px]:pt-[120px]">
          <Wrap>
            <div className="mx-auto max-w-[760px] text-center">
              <Eyebrow className="justify-center">{a.story.eyebrow}</Eyebrow>
              <h1 className="mt-[18px] font-serif text-[clamp(36px,5vw,56px)] leading-[1.04] tracking-[-0.025em] [font-weight:460]">
                {a.story.title}
              </h1>
            </div>
            <div className="mx-auto mt-10 flex max-w-[680px] flex-col gap-5">
              {a.story.paragraphs.map((p, i) => (
                <p key={i} className="text-[18px] leading-[1.65] text-ink-soft">
                  {withLinks(p)}
                </p>
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
                  <div className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[22px] bg-paper-3">
                    {person.photo ? (
                      <Image
                        src={person.photo}
                        alt={`Photo of ${person.name}`}
                        fill
                        sizes="(max-width: 860px) 100vw, 620px"
                        className="object-cover"
                      />
                    ) : (
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
                    )}
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
                        {withLinks(p)}
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
