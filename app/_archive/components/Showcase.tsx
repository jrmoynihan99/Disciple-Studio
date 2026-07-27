import { DATA } from "@/app/data";
import Image from "next/image";
import {
  Btn,
  Eyebrow,
  SecTitle,
  TrafficLights,
  Wrap,
} from "@/components/ui";

export default function Showcase() {
  const s = DATA.showcase;
  return (
    <section
      id="showcase"
      className="scroll-mt-[88px] border-y border-line bg-paper-2 pb-16 pt-[120px] max-[720px]:pt-[78px]"
    >
      <Wrap>
        <div className="grid grid-cols-[0.85fr_1.15fr] items-center gap-[60px] max-[920px]:grid-cols-1 max-[920px]:gap-10">
          <div>
            <Eyebrow>{s.eyebrow}</Eyebrow>
            <SecTitle>{s.title}</SecTitle>
            <p className="mt-[18px] max-w-[36em] text-[18px] leading-[1.5] text-ink-soft">
              {s.sub}
            </p>
            <Btn href={s.url} target="_blank" rel="noreferrer" className="mt-7">
              Visit live site <span>{"↗"}</span>
            </Btn>
          </div>
          <a
            className="group block overflow-hidden rounded-[22px] border border-line bg-card transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_40px_70px_-40px_rgba(28,24,19,0.5)]"
            href={s.url}
            target="_blank"
            rel="noreferrer"
          >
            <div className="flex items-center gap-1.5 border-b border-line px-4 py-[11px] font-mono text-[11px] text-muted">
              <TrafficLights small />
              <span className="ml-2">{s.urlLabel}</span>
            </div>
            <div className="overflow-hidden">
              <Image
                src="/AletheiaScreenshot.JPG"
                alt="Aletheia Church website screenshot"
                width={1920}
                height={1080}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-5 px-[26px] py-[22px]">
              <div>
                <div className="font-serif text-2xl">{s.church}</div>
              </div>
              {s.stats.length > 0 && (
                <div className="flex gap-[30px]">
                  {s.stats.map((x, i) => (
                    <div key={i}>
                      <b className="block font-serif text-2xl leading-none">
                        {x.k}
                      </b>
                      <span className="text-[11px] text-muted">{x.v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </a>
        </div>
        {/* <figure className="mx-auto mt-16 max-w-[820px] text-center">
          <blockquote className="font-serif text-[clamp(22px,3vw,30px)] leading-[1.4] tracking-[-0.01em]">
            &ldquo;{DATA.testimonial.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-6 flex flex-col gap-0.5">
            <b className="font-semibold">{DATA.testimonial.name}</b>
            <span className="text-sm text-muted">{DATA.testimonial.role}</span>
          </figcaption>
        </figure> */}
      </Wrap>
    </section>
  );
}
