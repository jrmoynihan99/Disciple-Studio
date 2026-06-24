import Nav from "@/app/components/Nav";
import Footer from "@/app/components/Footer";
import type { Metadata } from "next";
import { Eyebrow, SecTitle, Wrap } from "@/app/components/ui";

export const metadata: Metadata = {
  title: "Let’s Chat — Disciple Studio",
  description:
    "Pick a time for a quick call — tell us about your church and see how we can help.",
};

const CALENDLY_URL = "https://calendly.com/jrmoynihan99/30min";
const CALENDLY_PARAMS =
  "embed_type=Inline&hide_gdpr_banner=1&background_color=fbf9f4&text_color=1c1813&primary_color=bb4a23";

export default function Book() {
  return (
    <>
      <Nav />
      <main>
        <section className="pb-20 pt-[160px] max-[600px]:pt-[120px]">
          <Wrap>
            <div className="grid grid-cols-[0.45fr_0.55fr] items-start gap-14 max-[860px]:grid-cols-1 max-[860px]:gap-10">
              <div className="max-w-[420px] max-[860px]:text-center">
                <Eyebrow>Pick a time</Eyebrow>
                <SecTitle as="h1">Let{"’"}s talk about your church.</SecTitle>
                <p className="mt-[18px] text-[17px] leading-[1.6] text-ink-soft">
                  Pick a time that works for you. We{"’"}ll hop on a quick call
                  to hear about your church, answer any questions, and see how
                  we can help!
                </p>
                <p className="mt-4 text-[15px] leading-[1.6] text-ink-soft">
                  Or email us here:{" "}
                  <a
                    href="mailto:jrmoynihan99@gmail.com"
                    className="font-medium text-accent underline underline-offset-[3px] transition-opacity hover:opacity-75"
                  >
                    jrmoynihan99@gmail.com
                  </a>
                </p>
              </div>
              <div
                className="relative w-full min-w-0 overflow-hidden rounded-[22px]"
                style={{ height: 900 }}
              >
                <div className="absolute inset-0 grid place-items-center bg-paper-2">
                  <span className="font-mono text-xs tracking-[0.05em] text-muted">
                    loading calendar…
                  </span>
                </div>
                <iframe
                  src={`${CALENDLY_URL}?${CALENDLY_PARAMS}`}
                  title="Schedule a call with Disciple Studio"
                  className="relative h-full w-full border-0"
                />
              </div>
            </div>
          </Wrap>
        </section>
      </main>
      <Footer />
    </>
  );
}
