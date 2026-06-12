import Image from "next/image";
import { DATA } from "@/app/data";
import { Arrow, Btn, Eyebrow, Wrap } from "@/app/components/ui";

const STRIPES =
  "bg-[repeating-linear-gradient(45deg,var(--color-paper-2),var(--color-paper-2)_10px,var(--color-paper-3)_10px,var(--color-paper-3)_20px)]";

function Portrait({
  name,
  role,
  src,
  className = "",
}: {
  name: string;
  role: string;
  src?: string;
  className?: string;
}) {
  return (
    <figure className={`flex flex-col gap-3.5 ${className}`}>
      <div
        className={`relative grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-[22px] border border-line shadow-[0_30px_50px_-34px_rgba(28,24,19,0.45)] ${STRIPES}`}
      >
        {src ? (
          <Image
            src={src}
            alt={`Photo of ${name}`}
            fill
            sizes="(max-width: 920px) 50vw, 280px"
            className="object-cover"
          />
        ) : (
          <span className="font-mono text-[11px] tracking-[0.05em] text-muted">
            photo · {name}
          </span>
        )}
      </div>
      <figcaption className="text-center">
        <div className="font-serif text-[20px] leading-none">{name}</div>
        <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-accent">
          {role}
        </div>
      </figcaption>
    </figure>
  );
}

export default function HeroFaces() {
  const h = DATA.hero;
  const mobileBtn =
    "max-[920px]:px-[18px] max-[920px]:py-3 max-[920px]:text-sm";
  return (
    <section
      id="top"
      className="relative scroll-mt-[88px] overflow-hidden pt-[130px] max-[920px]:pt-[90px]"
    >
      <Wrap className="grid min-h-[76vh] grid-cols-[1fr_1fr] items-center gap-16 pb-[70px] max-[920px]:min-h-0 max-[920px]:grid-cols-1 max-[920px]:gap-12 max-[920px]:pt-2.5">
        <div>
          <Eyebrow>Two disciples serving the local church</Eyebrow>
          <h1 className="mt-[22px] max-w-[10.5em] font-serif text-[clamp(44px,6.2vw,76px)] leading-[1.04] tracking-[-0.03em] [font-weight:460]">
            <span>We build websites that help churches</span>
            <span className="italic">
              <em className="text-accent"> make disciples.</em>
            </span>
          </h1>
          <p className="mt-[26px] max-w-[31em] text-[clamp(17px,1.7vw,19px)] leading-[1.6] text-ink-soft">
            We&rsquo;re Jason and Arjun. We met at our church, saw that church
            sites could be doing a lot more to help people follow Jesus, and
            started building ones that do.
          </p>
          <div className="mt-[34px] flex flex-wrap gap-3.5 max-[920px]:flex-nowrap">
            <Btn href="/book" className={mobileBtn}>
              {h.primary} <Arrow />
            </Btn>
            <Btn
              variant="ghost"
              href={DATA.demoUrl}
              target="_blank"
              rel="noreferrer"
              className={mobileBtn}
            >
              &#9654; {h.secondary}
            </Btn>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-2 items-start gap-5 pb-10">
            <Portrait
              name="Jason"
              role="Design & Engineering"
              src="/jason.jpg"
            />
            <Portrait
              name="Arjun"
              role="Relationships"
              src="/arjun.jpg"
              className="translate-y-10"
            />
          </div>
        </div>
      </Wrap>
    </section>
  );
}
