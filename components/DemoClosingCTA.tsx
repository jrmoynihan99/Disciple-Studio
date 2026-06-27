import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

/**
 * The closing ask, appended below the demo. The lead magnet has been consumed;
 * this is the natural "want this for real?" moment. Honest urgency only — no
 * fake timers (pastors see through those): we built it by hand, we take on a few
 * churches at a time, and every week without this is a week members leave with
 * nowhere to go next.
 */
const REASONS = [
  "We made this one by hand, just for your church.",
  "We build with just a few churches at a time, so each one gets our full attention.",
  "Every week, people visit your site and leave with nowhere to go next — this closes that gap.",
];

export default function DemoClosingCTA({
  churchName,
  bookHref,
}: {
  churchName: string;
  bookHref: string;
}) {
  return (
    <section className="border-t border-edge bg-card px-6 py-16 text-ink sm:py-20">
      <div className="mx-auto max-w-[640px] text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          Built for {churchName}
        </span>
        <h2 className="mt-3 font-serif text-[clamp(26px,4.5vw,40px)] leading-[1.1]">
          Want this live on your site?
        </h2>
        <p className="mx-auto mt-4 max-w-[34em] text-[16px] leading-[1.6] text-ink-soft">
          This is a real, working demo — built just for you. If you{"’"}d want
          your members actually signing in and getting their next step, let
          {"’"}s talk.
        </p>

        <ul className="mx-auto mt-7 flex max-w-[32em] flex-col gap-3 text-left">
          {REASONS.map((r) => (
            <li key={r} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-brand">
                <Check className="h-2.5 w-2.5 text-on-accent" />
              </span>
              <span className="text-[14.5px] leading-[1.5] text-ink-soft">{r}</span>
            </li>
          ))}
        </ul>

        <div className="mt-9 flex flex-col items-center gap-3">
          <Link
            href={bookHref}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-[15px] font-semibold text-on-accent transition-opacity hover:opacity-90"
          >
            Let{"’"}s Chat
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="text-[12.5px] text-ink-muted">
            Or email{" "}
            <a
              href="mailto:jrmoynihan99@gmail.com"
              className="font-medium text-brand underline underline-offset-2 hover:opacity-80"
            >
              jrmoynihan99@gmail.com
            </a>
          </span>
        </div>
      </div>
    </section>
  );
}
