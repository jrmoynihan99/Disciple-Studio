"use client";

import { useEffect } from "react";
import Nav from "@/app/components/Nav";
import Footer from "@/app/components/Footer";

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
        <section className="book-page">
          <div className="wrap">
            <div className="book-grid">
              <div className="book-sidebar">
                <span className="eyebrow">Book a call</span>
                <h1 className="sec-title">
                  Let{"\u2019"}s talk about your church.
                </h1>
                <p className="book-sub">
                  Pick a time that works for you. We{"\u2019"}ll hop on a quick
                  call to hear about your church, answer any questions, and see
                  if we{"\u2019"}re a good fit.
                </p>
                <ul className="book-bullets">
                  <li>Learn what we can build for you</li>
                  <li>See a live demo of our work</li>
                  <li>No commitment, no pressure</li>
                </ul>
              </div>
              <div
                className="calendly-inline-widget"
                data-url={`${CALENDLY_URL}?hide_gdpr_banner=1&background_color=fbf9f4&text_color=1c1813&primary_color=bb4a23`}
                style={{ height: 900 }}
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
