import { DATA } from "@/app/data";
import { Arrow, Btn, Eyebrow, Wrap } from "@/components/ui";

const STRIPES =
  "bg-[repeating-linear-gradient(45deg,var(--color-paper-2),var(--color-paper-2)_10px,var(--color-paper-3)_10px,var(--color-paper-3)_20px)]";

function Signature({ name, role }: { name: string; role: string }) {
  return (
    <figure className="flex flex-col items-center gap-2.5">
      <div
        className={`grid h-[88px] w-[74px] place-items-center overflow-hidden rounded-[14px] border border-line ${STRIPES}`}
      >
        <span className="font-mono text-[9px] text-muted">photo</span>
      </div>
      <figcaption className="text-center">
        <div className="font-serif text-[17px] italic leading-none">
          {name}
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
          {role}
        </div>
      </figcaption>
    </figure>
  );
}

export default function HeroLetter() {
  const h = DATA.hero;
  return (
    <section
      id="top"
      className="relative scroll-mt-[88px] overflow-hidden pt-[140px] max-[920px]:pt-[100px]"
    >
      <Wrap className="flex min-h-[78vh] flex-col items-center pb-[80px] text-center max-[920px]:min-h-0">
        <Eyebrow className="justify-center">
          From two disciples at Aletheia Church
        </Eyebrow>
        <h1 className="mt-[26px] max-w-[13em] font-serif text-[clamp(42px,6vw,76px)] leading-[1.04] tracking-[-0.03em] [font-weight:460]">
          <span>We build websites that help churches</span>
          <span className="italic">
            <em className="text-accent"> make disciples.</em>
          </span>
        </h1>
        <div className="mt-8 flex max-w-[42em] flex-col gap-4 text-[clamp(17px,1.8vw,20px)] leading-[1.6] text-ink-soft">
          <p>
            We&rsquo;re Jason and Arjun. We met at our church in 2024 — Jason
            had just come to faith — and we couldn&rsquo;t stop talking about
            the same thing: the websites churches depend on weren&rsquo;t
            helping anyone follow Jesus.
          </p>
          <p>
            So we started building websites that do. Sites that welcome new
            people in, help the people already there take their next step, and
            give your staff their time back.
          </p>
        </div>
        <div className="mt-9 flex items-end gap-7">
          <Signature name="Jason" role="Design & Engineering" />
          <Signature name="Arjun" role="Marketing & Relationships" />
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3.5">
          <Btn href="/book">
            {h.primary} <Arrow />
          </Btn>
          <Btn
            variant="ghost"
            href={DATA.demoUrl}
            target="_blank"
            rel="noreferrer"
          >
            &#9654; {h.secondary}
          </Btn>
        </div>
      </Wrap>
    </section>
  );
}
