import Image from "next/image";

/* ---------- buttons ---------- */
export const nkBtn =
  "inline-block rounded-[5px] bg-nb-ink px-7 py-3.5 text-[17px] text-nb-paper shadow-[3px_3px_0_rgba(58,52,44,0.22)]";
export const nkGhost =
  "inline-block rounded-[5px] border-2 border-nb-ink bg-nb-card px-6 py-3 text-[17px] text-nb-ink";
export const nkCtaBtn =
  "inline-block rounded-[5px] border-2 border-nb-ink bg-nb-card px-7 py-[13px] text-[16.5px] text-nb-ink shadow-[3px_3px_0_rgba(58,52,44,0.18)]";
export const nkCtaBtnDark =
  "inline-block rounded-[5px] border-2 border-nb-hl bg-nb-hl px-7 py-[13px] text-[16.5px] text-nb-ink shadow-[4px_4px_0_rgba(0,0,0,0.28)]";

/* ---------- hand-written kicker ---------- */
export function Kicker({
  gold,
  children,
}: {
  gold?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-block -rotate-1 font-nb-hand text-[25px] ${gold ? "text-nb-gold" : "text-nb-tan"}`}
    >
      {children}
    </span>
  );
}

/* ---------- marker highlight ---------- */
export function Hl({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-[linear-gradient(180deg,transparent_58%,var(--color-nb-hl)_58%,var(--color-nb-hl)_92%,transparent_92%)] px-0.5">
      {children}
    </span>
  );
}

/* ---------- taped paper card ---------- */
export function Taped({
  alt,
  className = "",
  children,
}: {
  alt?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative border border-nb-border bg-nb-card shadow-[0_3px_14px_rgba(91,74,50,0.13)] ${
        alt ? "rotate-[0.7deg]" : "-rotate-[0.8deg]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Tape({ small }: { small?: boolean }) {
  return (
    <div
      className={`absolute -top-[13px] left-1/2 -translate-x-1/2 -rotate-2 bg-nb-gold/55 shadow-[0_1px_3px_rgba(91,74,50,0.12)] ${
        small ? "h-6 w-[90px]" : "h-7 w-[120px]"
      }`}
    />
  );
}

/* ---------- section header ---------- */
export function SectionHead({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-[680px] text-center max-md:px-6">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-1.5 text-balance text-4xl font-semibold leading-[1.2] max-md:text-3xl">
        {title}
      </h2>
      {sub && (
        <p className="mx-auto mt-3.5 max-w-[560px] text-pretty text-[16.5px] text-nb-muted">
          {sub}
        </p>
      )}
    </div>
  );
}

/* ---------- chapter / section CTA row ---------- */
export function ChapterCta({
  note,
  label,
  href,
  tight,
  dark,
}: {
  note: string;
  label: string;
  href: string;
  tight?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-4 px-6 ${
        tight ? "mt-[18px]" : dark ? "mt-11" : "mt-8"
      }`}
    >
      <span
        className={`-rotate-[1.2deg] font-nb-hand text-[23px] ${dark ? "text-nb-gold" : "text-nb-red"}`}
      >
        {note} →
      </span>
      <a
        className={dark ? nkCtaBtnDark : nkCtaBtn}
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {label} →
      </a>
    </div>
  );
}

/* ---------- image slot ---------- */
/* With a src it renders the image; without one it renders the same
   "drop an image here" placeholder the design mocks used, so empty
   slots still look intentional until real screenshots/photos exist. */
export function ImageSlot({
  src,
  alt = "",
  label,
  className = "",
}: {
  src?: string;
  alt?: string;
  label?: string;
  className?: string;
}) {
  if (src) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 880px) 100vw, 880px"
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-1.5 bg-black/[0.04] p-3 text-center text-[13px] font-medium leading-[1.3] tracking-[0.01em] text-black/55 [font-family:system-ui,sans-serif] ${className}`}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-45"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span className="max-w-[90%]">{label}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 border-[1.5px] border-dashed border-black/25"
      />
    </div>
  );
}

/* ---------- hand-drawn squiggle arrows between chapters ---------- */
const SQUIGS: { p: string; r: number; dash?: string }[] = [
  { p: "M30 4 C 46 26, 18 50, 31 82", r: -2 },
  {
    p: "M32 6 C 33 18, 20 22, 21 32 C 22 44, 43 44, 43 33 C 43 23, 29 22, 28 33 C 27 46, 31 60, 32 82",
    r: 2,
  },
  { p: "M32 4 Q 14 16, 32 28 Q 50 40, 32 52 Q 16 64, 32 80", r: 0 },
  { p: "M32 4 C 26 24, 38 42, 32 62 C 29 71, 30 76, 32 80", r: 0, dash: "1 8" },
];

export function Squiggle({ v = 1, dark }: { v?: number; dark?: boolean }) {
  const s = SQUIGS[(v - 1) % SQUIGS.length];
  return (
    <div
      className={`pointer-events-none flex justify-center ${
        dark ? "mb-11 text-nb-gold/50" : "mb-9 text-nb-red/40"
      }`}
      aria-hidden="true"
    >
      <svg
        width="64"
        height="92"
        viewBox="0 0 64 92"
        fill="none"
        style={{ transform: `rotate(${s.r}deg)` }}
      >
        <path
          d={s.p}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={s.dash}
        />
        <path
          d="M24 75 L32 86 L40 76"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
