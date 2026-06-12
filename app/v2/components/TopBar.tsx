import Link from "next/link";
import { V2 } from "@/app/v2/data";

export default function TopBar() {
  return (
    <div className="flex items-center justify-between border-b-2 border-nb-ink/15 px-12 py-6 max-md:px-5">
      <span className="inline-block -rotate-[1.5deg] rounded-[3px] border-2 border-nb-ink px-3.5 font-nb-hand text-[25px]">
        {V2.brand}
      </span>
      <div className="flex items-center gap-[26px]">
        <a
          className="border-b-2 border-nb-ink/30 font-nb-hand text-2xl leading-[1.15] text-nb-ink max-md:hidden"
          href={V2.nav.work.href}
          target="_blank"
          rel="noreferrer"
        >
          {V2.nav.work.label.toLowerCase()}
        </a>
        <Link
          className="font-nb-hand text-2xl text-nb-red"
          href={V2.nav.talk.href}
        >
          {V2.nav.talk.label} →
        </Link>
      </div>
    </div>
  );
}
