import { V2 } from "@/app/v2/data";
import {
  ChapterCta,
  ImageSlot,
  SectionHead,
  Tape,
  Taped,
} from "@/app/v2/components/ui";

export default function Showcase() {
  const s = V2.showcase;
  return (
    <section className="pt-[104px]">
      <div className="mx-auto max-w-[980px] px-12 max-md:px-5">
        <SectionHead kicker={s.eyebrow} title={s.title} sub={s.sub} />
        <Taped className="mx-auto max-w-[880px] p-3">
          <Tape />
          <div className="overflow-hidden rounded-lg border border-nb-border bg-nb-card">
            <div className="flex items-center gap-1.5 border-b border-nb-border bg-nb-cream px-3.5 py-[11px]">
              {[0, 1, 2].map((i) => (
                <i key={i} className="h-[9px] w-[9px] rounded-full bg-[#d6c9a8]" />
              ))}
              <span className="ml-2.5 font-mono text-[12.5px] text-nb-tan">
                {s.urlLabel}
              </span>
            </div>
            <ImageSlot
              src="/AletheiaScreenshot.JPG"
              alt={`${s.church} website screenshot`}
              className="block h-[480px] w-full max-md:h-[300px]"
            />
            <div className="flex items-center border-t border-nb-border bg-nb-cream px-[18px] pb-2.5 pt-2">
              <b className="font-nb-hand text-[25px] font-semibold text-nb-ink">
                {s.church}
              </b>
            </div>
          </div>
        </Taped>
        <ChapterCta tight note={s.note} label={s.visit} href={s.url} />
      </div>
    </section>
  );
}
