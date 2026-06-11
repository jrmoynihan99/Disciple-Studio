import { DATA } from "@/app/data";
import { Wrap } from "@/app/components/ui";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-paper-2 pb-[30px] pt-14">
      <Wrap className="grid grid-cols-[1.4fr_1fr] items-start gap-[30px] max-[720px]:grid-cols-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-[15px] text-white">
            {"✝"}
          </span>
          <span className="font-serif text-[17px] tracking-[-0.02em] [font-weight:680]">
            Disciple Studio
          </span>
          <p className="mt-1.5 basis-full text-sm text-muted">{DATA.tagline}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-[18px] max-[720px]:justify-start">
          {DATA.nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm text-ink-soft hover:text-accent"
            >
              {n.label}
            </a>
          ))}
          <a href="/book" className="text-sm text-ink-soft hover:text-accent">
            Book a call
          </a>
        </div>
        <div className="col-span-full mt-[34px] flex flex-wrap justify-between gap-3.5 border-t border-line pt-[22px] font-mono text-[11.5px] text-muted">
          <span>&copy; 2026 Disciple Studio &middot; For the local church</span>
        </div>
      </Wrap>
    </footer>
  );
}
