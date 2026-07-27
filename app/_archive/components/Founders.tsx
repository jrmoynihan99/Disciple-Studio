import Image from "next/image";
import { DATA } from "@/app/data";
import { Arrow, Btn, Eyebrow, SecTitle, Wrap } from "@/components/ui";

const STRIPES =
  "bg-[repeating-linear-gradient(45deg,var(--color-paper-2),var(--color-paper-2)_9px,var(--color-paper-3)_9px,var(--color-paper-3)_18px)]";

export default function Founders() {
  const f = DATA.founders;
  return (
    <section
      id="founders"
      className="scroll-mt-[88px] py-[120px] max-[720px]:py-[78px]"
    >
      <Wrap>
        <div className="grid grid-cols-[0.85fr_1.15fr] gap-[60px] max-[860px]:grid-cols-1 max-[860px]:gap-9">
          <div>
            <Eyebrow>{f.eyebrow}</Eyebrow>
            <SecTitle>{f.title}</SecTitle>
            <p className="mt-[22px] text-[17px] leading-[1.6] text-ink-soft">
              {f.body}
            </p>
            <Btn href="/about-us" className="mt-7">
              More About Us <Arrow />
            </Btn>
          </div>
          <div className="flex flex-col gap-7">
            {f.people.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-[150px_1fr] items-center gap-[22px]"
              >
                <div
                  className={`relative grid aspect-[3/4] place-items-center overflow-hidden rounded-[14px] ${STRIPES}`}
                >
                  {p.photo ? (
                    <Image
                      src={p.photo}
                      alt={`Photo of ${p.name}`}
                      fill
                      sizes="150px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="font-mono text-[11px] tracking-[0.05em] text-muted">
                      portrait
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-serif text-[22px]">{p.name}</div>
                  <div className="mb-[9px] mt-[3px] font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                    {p.role}
                  </div>
                  <p className="text-[14.5px] leading-[1.55] text-ink-soft">
                    {p.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Wrap>
    </section>
  );
}
