import { DATA } from "@/app/data";

export default function Backends() {
  return (
    <section>
      <div className="flex items-center gap-[22px] overflow-hidden border-y border-line bg-paper-2 py-3.5">
        <span className="inline-flex flex-none items-center gap-2 whitespace-nowrap pl-8 font-mono text-xs tracking-[0.02em] text-ink-soft">
          {DATA.backendsLead} <i className="not-italic text-accent">&rarr;</i>
        </span>
        <div
          className="min-w-0 flex-1 overflow-hidden whitespace-nowrap [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_90%,transparent)]"
          aria-hidden="true"
        >
          <div className="inline-flex animate-marq">
            {[0, 1].map((r) => (
              <span key={r} className="inline-flex">
                {DATA.backends.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-5 px-5 font-mono text-[13px] tracking-[0.04em] text-ink-soft"
                  >
                    {b}
                    <i className="not-italic text-accent opacity-55">
                      {"✦"}
                    </i>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
