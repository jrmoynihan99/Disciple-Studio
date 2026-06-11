import { DATA } from "@/app/data";
import { Eyebrow, SecTitle, Wrap } from "@/app/components/ui";

export default function TwoJobs() {
  const t = DATA.twoJobs;
  return (
    <section
      id="what"
      className="scroll-mt-[88px] bg-paper py-[120px] max-[720px]:py-[78px]"
    >
      <Wrap>
        <div className="mx-auto mb-14 max-w-[760px] text-center">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <SecTitle>{t.title}</SecTitle>
          <p className="mx-auto mt-[18px] max-w-[36em] text-[18px] leading-[1.5] text-ink-soft">
            {t.intro}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-[22px] max-[820px]:grid-cols-1">
          {t.jobs.map((j, i) => {
            const dark = j.tag === "Disciple";
            return (
              <div
                key={i}
                className={`flex flex-col rounded-[22px] border p-[38px] transition-[translate,box-shadow] duration-[280ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1 hover:shadow-[0_34px_56px_-36px_rgba(28,24,19,0.45)] max-[820px]:p-[22px] ${
                  dark
                    ? "relative overflow-hidden border-transparent bg-dark-bg text-dark-ink after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(125%_80%_at_100%_0%,var(--color-accent-tint),transparent_58%)] after:content-[''] [&>*]:relative [&>*]:z-[1]"
                    : "border-line bg-card"
                }`}
              >
                <div className="mb-[22px] flex items-center gap-3 max-[820px]:mb-3.5">
                  <span className="font-mono text-xs font-semibold tracking-[0.1em] text-accent">
                    {j.n}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.14em] ${
                      dark
                        ? "bg-[rgba(244,240,232,0.09)] text-[rgba(244,240,232,0.86)]"
                        : "bg-accent-tint text-accent"
                    }`}
                  >
                    {j.tag}
                  </span>
                </div>
                <div className="font-serif text-[clamp(22px,2.6vw,30px)] leading-[1.1] tracking-[-0.02em]">
                  {j.sub}
                </div>
                <p
                  className={`mt-3.5 text-base leading-[1.6] max-[820px]:mt-2.5 max-[820px]:text-[14.5px] ${
                    dark ? "text-dark-muted" : "text-ink-soft"
                  }`}
                >
                  {j.body}
                </p>
                <ul className="mt-5 flex list-none flex-col gap-2.5 max-[820px]:mt-3.5 max-[820px]:gap-[7px]">
                  {j.points.map((p, k) => (
                    <li
                      key={k}
                      className="flex items-center gap-[11px] text-[14.5px] font-medium max-[820px]:text-[13.5px]"
                    >
                      <span className="font-bold text-accent">&rarr;</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <div
                  className={`mt-auto flex flex-col gap-[3px] border-t pt-6 max-[820px]:pt-4 ${
                    dark ? "border-dark-line" : "border-line"
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] tracking-[0.14em] ${
                      dark ? "text-dark-muted" : "text-muted"
                    }`}
                  >
                    THE RESULT
                  </span>
                  <b className="font-serif text-[clamp(19px,2.3vw,25px)] tracking-[-0.01em]">
                    {j.outcome}
                  </b>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mx-auto mt-[42px] max-w-[26em] text-center font-serif text-[clamp(20px,2.6vw,27px)] italic leading-[1.32]">
          {t.kicker}
        </p>
      </Wrap>
    </section>
  );
}
