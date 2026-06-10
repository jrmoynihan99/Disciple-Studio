import Nav from "@/app/components/Nav";
import Footer from "@/app/components/Footer";
import { DATA } from "@/app/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us — Disciple Studio",
  description:
    "Meet Jason and Arjun — two disciples building custom websites for the local church.",
};

export default function AboutUs() {
  const a = DATA.aboutUs;
  return (
    <>
      <Nav />
      <main>
        {/* Our Story */}
        <section className="about-hero section-pad">
          <div className="wrap">
            <div className="about-hero-grid">
              <div className="about-hero-copy">
                <span className="eyebrow">{a.story.eyebrow}</span>
                <h1 className="sec-title about-title">{a.story.title}</h1>
                <div className="about-story">
                  {a.story.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
              <div className="about-hero-photo">
                <span className="mono">photo</span>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Values */}
        <section className="about-mission section-pad">
          <div className="wrap">
            <div className="sec-head center">
              <span className="eyebrow">{a.mission.eyebrow}</span>
              <h2 className="sec-title">{a.mission.title}</h2>
              <p className="mission-lead">{a.mission.intro}</p>
            </div>
            <div className="mission-values">
              {a.mission.values.map((v, i) => (
                <div key={i} className="value-card">
                  <div className="value-top">
                    <span className="value-idx mono">
                      {"0" + (i + 1)}
                    </span>
                    <span className="value-pill mono">{v.label}</span>
                  </div>
                  <h3 className="value-label serif">{v.label}</h3>
                  <p>{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Deep Bios */}
        <section className="about-bios section-pad">
          <div className="wrap">
            <div className="sec-head center">
              <span className="eyebrow">{a.bios.eyebrow}</span>
              <h2 className="sec-title">{a.bios.title}</h2>
            </div>
            <div className="bios-grid">
              {a.bios.people.map((person, i) => (
                <div key={i} className="bio-item">
                  <div className="bio-photo">
                    <div className="bio-photo-inner">
                      <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="bio-silhouette">
                        <circle cx="60" cy="40" r="28" fill="currentColor" />
                        <ellipse cx="60" cy="130" rx="48" ry="42" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                  <div className="bio-copy">
                    <div className="bio-name serif">{person.name}</div>
                    <div className="bio-role mono">{person.role}</div>
                    {person.paragraphs.map((p, j) => (
                      <p key={j} className="bio-text">
                        {p}
                      </p>
                    ))}
                    {person.verse && (
                      <blockquote className="bio-verse">
                        <span className="serif ital">
                          {"\u201C"}
                          {person.verse.text}
                          {"\u201D"}
                        </span>
                        <cite className="mono">{person.verse.ref}</cite>
                      </blockquote>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="about-cta cta-sec">
          <div className="wrap cta-in">
            <h2 className="cta-title serif">
              {a.cta.title[0]}
              <br />
              <span className="ital">{a.cta.title[1]}</span>
            </h2>
            <p className="cta-sub">{a.cta.sub}</p>
            <div className="cta-actions">
              <a href="/book" className="btn btn-primary">
                {a.cta.primary} <span className="arrow">{"\u2192"}</span>
              </a>
              <a href="/" className="btn btn-ghost light">
                {"\u2190"} {a.cta.secondary}
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
