import { DATA } from "@/app/data";
import { Wrap } from "@/app/components/ui";

/* small line icons for the inventory strip */
function StackIcon({ name, size = 18 }: { name?: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "site": // monitor
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M9 21h6M12 17v4" />
        </svg>
      );
    case "app": // phone
      return (
        <svg {...common}>
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
          <path d="M11 18.5h2" />
        </svg>
      );
    case "cms": // layers
      return (
        <svg {...common}>
          <path d="M12 3l9 5-9 5-9-5 9-5z" />
          <path d="M3 13l9 5 9-5" />
        </svg>
      );
    case "sync": // refresh arrows
      return (
        <svg {...common}>
          <path d="M4 11a8 8 0 0 1 13.7-5.3L20 8" />
          <path d="M20 13a8 8 0 0 1-13.7 5.3L4 16" />
          <path d="M20 4v4h-4M4 20v-4h4" />
        </svg>
      );
    case "disciple": // route
      return (
        <svg {...common}>
          <circle cx="6" cy="19" r="2.2" />
          <circle cx="18" cy="5" r="2.2" />
          <path d="M8.2 19H14a3 3 0 0 0 3-3V7.2" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}

/* the four parts that pour into the engine */
function PartCard({
  it,
}: {
  it: { icon: string; k: string; v: string };
}) {
  return (
    <li className="flex flex-col gap-2.5 bg-paper px-5 py-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 flex-none place-items-center rounded-[10px] bg-accent-tint text-accent">
          <StackIcon name={it.icon} size={16} />
        </span>
        <span className="font-serif text-[18px] leading-[1.15] tracking-[-0.01em]">
          {it.k}
        </span>
      </div>
      <span className="text-[13.5px] leading-[1.45] text-ink-soft">{it.v}</span>
    </li>
  );
}

/* icon + title for the engine, shown as a plain (non-card) item */
function EngineHead({ k }: { k: string }) {
  return (
    <div className="flex items-center justify-center gap-3.5 text-center max-[520px]:flex-col max-[520px]:gap-2.5">
      <span className="grid h-12 w-12 flex-none place-items-center rounded-[14px] bg-accent text-white shadow-[0_10px_24px_-12px_var(--color-accent)]">
        <StackIcon name="disciple" size={24} />
      </span>
      <h3 className="font-serif text-[clamp(22px,2.6vw,28px)] leading-[1.1] tracking-[-0.02em] text-accent [font-weight:460]">
        {k}
      </h3>
    </div>
  );
}

export default function WhatYouGet() {
  const { kicker, items, engine } = DATA.whatYouGet;

  return (
    <section className="bg-paper pb-[64px] pt-[10px] max-[720px]:pb-12">
      <Wrap>
        <p className="mx-auto mb-9 max-w-[34em] text-center font-mono text-[12.5px] uppercase tracking-[0.12em] text-ink-soft max-[720px]:mb-7">
          {kicker}
        </p>

        {/* the four parts — 4-up on desktop, 2x2 on mobile */}
        <ul className="grid list-none grid-cols-4 gap-px overflow-hidden rounded-2xl border border-line bg-line max-[520px]:grid-cols-2">
          {items.map((it) => (
            <PartCard key={it.k} it={it} />
          ))}
        </ul>

        {/* ---- desktop: funnel that draws the four down into the engine ---- */}
        <div className="hidden min-[521px]:block">
          <p className="mt-6 text-center font-mono text-[11.5px] uppercase tracking-[0.16em] text-accent">
            {engine.lead}
          </p>
          <svg
            width="100%"
            height="70"
            viewBox="0 0 100 70"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
            className="mt-1.5"
          >
            {/* outer funnel walls — wrap around the four */}
            {[2, 98].map((x) => (
              <line
                key={x}
                x1={x}
                y1="0"
                x2="50"
                y2="70"
                stroke="var(--color-line)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {/* inner drops from the two middle parts, fainter */}
            {[37.5, 62.5].map((x) => (
              <line
                key={x}
                x1={x}
                y1="0"
                x2="50"
                y2="70"
                stroke="var(--color-line-2)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <div className="-mt-1">
            <EngineHead k={engine.k} />
          </div>
        </div>

        {/* ---- mobile: simple connector + engine ---- */}
        <div className="min-[521px]:hidden">
          <div className="flex flex-col items-center" aria-hidden="true">
            <span className="h-7 w-px bg-line" />
            <span className="-mt-px grid h-7 w-7 place-items-center rounded-full border border-line bg-paper text-accent">
              <StackIcon name="disciple" size={14} />
            </span>
          </div>
          <p className="mt-3 text-center font-mono text-[11.5px] uppercase tracking-[0.16em] text-accent">
            {engine.lead}
          </p>
          <div className="mt-3">
            <EngineHead k={engine.k} />
          </div>
          <p className="mx-auto mt-3 max-w-[30em] text-center text-[15px] leading-[1.5] text-ink-soft">
            {engine.v}
          </p>
        </div>
      </Wrap>
    </section>
  );
}
