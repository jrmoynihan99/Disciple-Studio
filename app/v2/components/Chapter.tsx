import type { ChapterData, DemoLink, ReceiptData } from "@/app/v2/data";
import {
  ChapterCta,
  ImageSlot,
  Kicker,
  Squiggle,
  Tape,
  Taped,
} from "@/app/v2/components/ui";

const CHAPTER_WORDS = ["one", "two", "three", "four", "five", "six"];

export default function Chapter({
  ch,
  art,
  art2,
  splitAt,
  receipt,
  cta,
  arrow,
}: {
  ch: ChapterData;
  art?: React.ReactNode;
  art2?: React.ReactNode;
  splitAt?: number;
  receipt?: ReceiptData;
  cta?: DemoLink;
  arrow?: number;
}) {
  const head = splitAt ? ch.paras.slice(0, splitAt) : ch.paras;
  const tail = splitAt ? ch.paras.slice(splitAt) : [];
  const num = parseInt(ch.n, 10);
  return (
    <section
      id={`chapter-${num}`}
      className={`relative ${arrow ? "pt-9" : "pt-[104px]"}`}
    >
      {arrow ? <Squiggle v={arrow} /> : null}
      <div className="text-center">
        <Kicker>chapter {CHAPTER_WORDS[num - 1]}</Kicker>
      </div>
      <h2 className="mb-[22px] mt-1 text-balance px-5 text-center text-[32px] font-semibold leading-[1.25]">
        {ch.title}
      </h2>
      <div className="mx-auto max-w-[620px] px-10 max-md:px-6">
        {head.map((p, i) => (
          <p key={i} className="mb-5 text-pretty text-lg">
            {p}
          </p>
        ))}
      </div>
      {art && (
        <div className="relative mx-auto mt-[46px] max-w-[860px] px-10 max-md:px-5">
          {art}
        </div>
      )}
      {tail.length > 0 && (
        <div className="mx-auto mt-[42px] max-w-[620px] px-10 max-md:px-6">
          {tail.map((p, i) => (
            <p key={i} className="mb-5 text-pretty text-lg">
              {p}
            </p>
          ))}
        </div>
      )}
      {art2 && (
        <div className="relative mx-auto mt-[46px] max-w-[860px] px-10 max-md:px-5">
          {art2}
        </div>
      )}
      {cta && (
        <ChapterCta tight note={cta.note} label={cta.label} href={cta.href} />
      )}
      {receipt && <Receipt r={receipt} />}
    </section>
  );
}

export function Receipt({ r }: { r: ReceiptData }) {
  return (
    <div className="relative mx-auto mt-[30px] max-w-[480px] -rotate-[1.2deg] border border-nb-receipt-line bg-nb-receipt px-6 pb-[22px] pt-5 shadow-[3px_4px_0_rgba(58,52,44,0.12)] max-md:mx-6">
      <Tape small />
      <span className="mb-0.5 block font-nb-hand text-[23px] text-nb-red">
        {r.tag.toLowerCase()}
      </span>
      <b className="mb-2.5 block text-[17.5px] font-semibold">{r.title}</b>
      <ul className="flex flex-col gap-[5px]">
        {r.points.map((p, i) => (
          <li key={i} className="flex gap-[9px] text-[15px]">
            <span className="font-bold text-nb-green">✓</span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- chapter two: before/after shots ---------- */
export function Shots() {
  return (
    <Taped className="p-6">
      <Tape />
      <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
        <div>
          <div className="mb-1.5 text-center font-nb-hand text-[23px] text-[#876e64]">
            before…
          </div>
          <ImageSlot
            label="screenshot of the old templated site"
            className="h-[250px] w-full"
          />
        </div>
        <div>
          <div className="mb-1.5 text-center font-nb-hand text-[23px]">
            …after!
          </div>
          <ImageSlot
            label="screenshot of the new site"
            className="h-[250px] w-full"
          />
        </div>
      </div>
    </Taped>
  );
}

/* ---------- chapter three: the CMS polaroid ---------- */
export function Cms() {
  return (
    <div className="mx-auto max-w-[640px]">
      <Taped alt className="p-6">
        <Tape />
        <ImageSlot
          label="screenshot of the custom CMS"
          className="h-[320px] w-full"
        />
      </Taped>
      <p className="mt-3.5 -rotate-1 text-center font-nb-hand text-[22px] text-nb-muted">
        the CMS we built — just the things your staff actually needs
      </p>
    </div>
  );
}

/* ---------- chapter four: sync diagrams ---------- */
function Diagram({ broken }: { broken?: boolean }) {
  return (
    <Taped alt className="p-6">
      <Tape />
      <div className="flex items-center justify-center py-3.5 max-md:flex-col">
        <div className="min-w-[180px] rounded-md border-2 border-nb-ink bg-nb-card px-[18px] py-3.5 text-center shadow-[3px_3px_0_rgba(58,52,44,0.16)]">
          <b className="block text-[15.5px] font-semibold">
            Church Community Builder
          </b>
          <span className="text-[13px] text-nb-muted">
            {broken ? "members · groups · events" : "the single source of truth"}
          </span>
        </div>
        <div className="flex flex-col items-center gap-px px-3.5 max-md:py-1.5">
          <small
            className={`whitespace-nowrap font-nb-hand text-xl ${
              broken ? "text-nb-red" : "text-nb-green"
            }`}
          >
            {broken ? "re-typed by hand!" : "syncs automatically"}
          </small>
          <div
            className={`w-[100px] border-t-[2.5px] max-md:h-10 max-md:w-0 max-md:border-l-[2.5px] max-md:border-t-0 ${
              broken
                ? "border-dashed border-nb-red"
                : "border-solid border-nb-green"
            }`}
          />
        </div>
        <div className="min-w-[180px] rounded-md border-2 border-nb-ink bg-nb-card px-[18px] py-3.5 text-center shadow-[3px_3px_0_rgba(58,52,44,0.16)]">
          <b className="block text-[15.5px] font-semibold">
            {broken ? "Website CMS" : "The website"}
          </b>
          <span className="text-[13px] text-nb-muted">
            {broken ? "the same events, again" : "always current"}
          </span>
        </div>
      </div>
    </Taped>
  );
}

export function DiagramBefore() {
  return (
    <div>
      <Diagram broken />
      <p className="mt-3.5 -rotate-1 text-center font-nb-hand text-[22px] text-nb-muted">
        every event, entered twice. sound familiar?
      </p>
    </div>
  );
}

export function DiagramAfter() {
  return (
    <div>
      <Diagram />
      <p className="mt-3.5 -rotate-1 text-center font-nb-hand text-[22px] text-nb-muted">
        enter it once — it&rsquo;s everywhere.
      </p>
    </div>
  );
}
