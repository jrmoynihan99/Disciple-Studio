import { ArrowRight, Check } from "lucide-react";

const PITCH =
  "We build full custom websites and apps focused on personalized discipleship. We’d love to build one for you.";

// The popup leads with this; the footer (which sits right below the demo) drops it.
const DEMO_INTRO = "This is a demo of the member portal only — ";

/**
 * The shared CTA content — used by the closing footer section and the in-demo
 * popup (every placeholder button opens that popup). The popup leads with the
 * demo framing; the footer omits it since it directly follows the demo.
 */
export function DemoCTAContent({
  bookHref,
  demo = false,
  feature,
}: {
  bookHref: string;
  demo?: boolean;
  /** When set (in-demo button clicks), the headline names the clicked feature:
   *  "{feature} Available in Full Build". The footer omits it for the generic ask. */
  feature?: string;
}) {
  return (
    <>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
        Work with us
      </span>
      <h2 className="mt-3 font-serif text-[clamp(26px,4.5vw,40px)] leading-[1.1]">
        {feature ? `${feature} Available in Full Build` : "Want this for your church?"}
      </h2>
      <p className="mx-auto mt-4 max-w-[34em] text-[16px] leading-[1.6] text-ink-soft">
        {/* Popup leads with the demo framing (lowercased to flow after the dash);
            the footer drops it. */}
        {demo ? DEMO_INTRO + PITCH.charAt(0).toLowerCase() + PITCH.slice(1) : PITCH}
      </p>

      <div className="mt-5 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-[13.5px] text-ink-soft">
          <span className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-brand">
            <Check className="h-2.5 w-2.5 text-on-accent" />
          </span>
          We only work with a few churches at a time.
        </div>
        {/* Plain <a> (full page nav) so the studio's dark CSS can't bleed onto
            the marketing pages during a client-side transition. */}
        <a
          href={bookHref}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-[15px] font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          Let{"’"}s Chat
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2.5 text-[12.5px] text-ink-muted">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional full reload so the studio's dark CSS doesn't bleed onto the marketing home */}
        <a
          href="/"
          className="font-medium text-ink-soft underline underline-offset-2 transition-colors hover:text-ink"
        >
          About Us
        </a>
        <span>
          Or email{" "}
          <a
            href="mailto:jrmoynihan99@gmail.com"
            className="font-medium text-brand underline underline-offset-2 hover:opacity-80"
          >
            jrmoynihan99@gmail.com
          </a>
        </span>
      </div>
    </>
  );
}

/**
 * The closing ask, appended below the demo. The lead magnet has been consumed;
 * this turns it into the real offer — building it into their live site.
 */
export default function DemoClosingCTA({ bookHref }: { bookHref: string }) {
  return (
    <section className="border-t border-edge bg-card px-6 py-16 text-ink sm:py-20">
      <div className="mx-auto max-w-[640px] text-center">
        <DemoCTAContent bookHref={bookHref} />
      </div>
    </section>
  );
}
