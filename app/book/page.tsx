"use client";

import { useEffect } from "react";
import Nav from "@/app/components/Nav";
import Footer from "@/app/components/Footer";
import { Eyebrow, SecTitle, Wrap } from "@/app/components/ui";

const CALENDLY_URL = "https://calendly.com/jrmoynihan99/30min";

export default function Book() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <Nav />
      <main>
        <section className="pb-20 pt-[160px] max-[600px]:pt-[120px]">
          <Wrap>
            <div className="grid grid-cols-[0.45fr_0.55fr] items-center gap-14 max-[860px]:grid-cols-1 max-[860px]:gap-10">
              <div className="max-w-[420px] max-[860px]:text-center">
                <Eyebrow>Book a call</Eyebrow>
                <SecTitle as="h1">
                  Let{"’"}s talk about your church.
                </SecTitle>
                <p className="mt-[18px] text-[17px] leading-[1.6] text-ink-soft">
                  Pick a time that works for you. We{"’"}ll hop on a quick call
                  to hear about your church, answer any questions, and see if
                  we{"’"}re a good fit.
                </p>
                <ul className="mt-8 flex list-none flex-col gap-3.5 max-[860px]:items-center">
                  <li className="relative pl-6 text-[15px] text-ink-soft before:absolute before:left-0 before:font-semibold before:text-accent before:content-['✓']">
                    Learn what we can build for you
                  </li>
                  <li className="relative pl-6 text-[15px] text-ink-soft before:absolute before:left-0 before:font-semibold before:text-accent before:content-['✓']">
                    See a live demo of our work
                  </li>
                  <li className="relative pl-6 text-[15px] text-ink-soft before:absolute before:left-0 before:font-semibold before:text-accent before:content-['✓']">
                    No commitment, no pressure
                  </li>
                </ul>
              </div>
              {/* Calendly's script finds this div by the `calendly-inline-widget` class — keep it */}
              <div
                className="calendly-inline-widget w-full min-w-0 overflow-hidden rounded-[22px]"
                data-url={`${CALENDLY_URL}?hide_gdpr_banner=1&background_color=fbf9f4&text_color=1c1813&primary_color=bb4a23`}
                style={{ height: 900 }}
              />
            </div>
          </Wrap>
        </section>
      </main>
      <Footer />
    </>
  );
}
