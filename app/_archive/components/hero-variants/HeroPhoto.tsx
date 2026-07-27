import { DATA } from "@/app/data";
import { Arrow, Btn, Eyebrow, Wrap } from "@/components/ui";

export default function HeroPhoto() {
  const h = DATA.hero;
  return (
    <section
      id="top"
      className="relative flex min-h-[94vh] scroll-mt-[88px] flex-col justify-end overflow-hidden bg-[#171310] pt-[130px]"
    >
      {/* photo placeholder backdrop — swap for a real full-bleed image */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(187,74,35,0.22),transparent_65%)]" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_22px,rgba(244,240,232,0.025)_22px,rgba(244,240,232,0.025)_44px)]" />
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-[linear-gradient(transparent,rgba(15,12,9,0.92))]" />
        <div className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-dashed border-white/20 px-7 py-5 text-center">
          <span className="block font-mono text-[11px] tracking-[0.14em] text-dark-muted">
            FULL-BLEED PHOTOGRAPH
          </span>
          <span className="mt-1.5 block max-w-[26em] text-[13px] leading-[1.5] text-dark-muted/80">
            The two of you with your congregation at Aletheia — warm light,
            real faces, nothing staged.
          </span>
        </div>
      </div>

      <Wrap className="relative z-[1] pb-[76px]">
        <Eyebrow>Two disciples serving the local church</Eyebrow>
        <h1 className="mt-5 max-w-[12em] font-serif text-[clamp(44px,6.4vw,80px)] leading-[1.02] tracking-[-0.03em] text-dark-ink [font-weight:460]">
          <span>We build websites that help churches</span>
          <span className="italic">
            <em className="text-[color-mix(in_oklab,var(--color-accent)_72%,#f4f0e8)]">
              {" "}
              make disciples.
            </em>
          </span>
        </h1>
        <p className="mt-6 max-w-[32em] text-[clamp(16px,1.7vw,19px)] leading-[1.6] text-dark-ink/80">
          We&rsquo;re Jason and Arjun — we met at our church, and we build
          custom websites that welcome new people in and help the people
          already there follow Jesus.
        </p>
        <div className="mt-9 flex flex-wrap gap-3.5">
          <Btn href="/book">
            {h.primary} <Arrow />
          </Btn>
          <Btn
            variant="ghostLight"
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
