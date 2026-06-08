"use client";

import { DATA } from "@/app/data";

function MiniSite({ mode }: { mode: "desktop" | "mobile" }) {
  return (
    <div className={`minisite ms-${mode}`}>
      <div className="ms-topnav">
        <b className="serif">Grace</b>
        {mode === "desktop" && (
          <span className="ms-navlinks">
            <i />
            <i />
            <i />
          </span>
        )}
        <u className="ms-give">Give</u>
      </div>
      <div className="ms-hero2">
        <div className="ms-h serif">You&rsquo;re welcome here.</div>
        <div className="ms-line" />
        <div className="ms-line short" />
        <span className="ms-cta">Plan your visit</span>
      </div>
      <div className="ms-sec">
        <div className="ms-label mono">THIS SUNDAY</div>
        <div className={`ms-cards2 ${mode === "mobile" ? "col" : ""}`}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="ms-card">
              <div className="ms-thumb" />
              <div className="ms-line tiny" />
              <div className="ms-line tiny short" />
            </div>
          ))}
        </div>
      </div>
      <div className="ms-sec ms-band">
        <div className="ms-h2 serif">Find your people.</div>
        <span className="ms-cta light">Explore groups</span>
      </div>
      <div className="ms-sec">
        <div className="ms-label mono">LATEST SERMON</div>
        <div className="ms-wide" />
      </div>
      <div className="ms-foot">
        <b className="serif">Grace</b>
        <span />
      </div>
    </div>
  );
}

function HeroDevices() {
  return (
    <div className="herodevices">
      <div className="laptop">
        <div className="laptop-screen">
          <span className="laptop-cam" />
          <div className="laptop-viewport">
            <div className="dev-scroll lap-scroll">
              <MiniSite mode="desktop" />
              <MiniSite mode="desktop" />
            </div>
          </div>
          <div className="screen-glare" />
        </div>
        <div className="laptop-base">
          <span className="laptop-lip" />
        </div>
      </div>
      <div className="phone2">
        <span className="phone2-notch" />
        <div className="phone2-screen">
          <div className="dev-scroll ph-scroll">
            <MiniSite mode="mobile" />
            <MiniSite mode="mobile" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSite() {
  return (
    <div className="herosite">
      <div className="demo-frame">
        <div className="demo-bar">
          <span className="tl" />
          <span className="tl" />
          <span className="tl" />
          <div className="demo-barlabel mono">gracecommunity.example</div>
        </div>
        <div className="hs-body">
          <div className="hs-nav">
            <b className="serif">Grace</b>
            <span />
            <span />
            <span />
            <i className="hs-pill">Give</i>
          </div>
          <div className="hs-hero">
            <div className="hs-hero-img">
              <span className="mono">church photo</span>
            </div>
            <div className="hs-hero-copy">
              <div className="hs-h serif">You&rsquo;re welcome here.</div>
              <div className="hs-p" />
              <div className="hs-p short" />
              <i className="hs-btn">Plan your visit</i>
            </div>
          </div>
          <div className="hs-cards">
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>
      <div className="hs-badge">
        <b>0.4s</b>
        <span>load</span>
      </div>
    </div>
  );
}

function HeroDash() {
  return (
    <div className="herodash">
      <div className="demo-frame">
        <div className="demo-bar">
          <span className="tl" />
          <span className="tl" />
          <span className="tl" />
          <div className="demo-barlabel mono">studio &middot; dashboard</div>
        </div>
        <div className="hd-body">
          <div className="hd-side">
            <span className="hd-si active">Sermons</span>
            <span className="hd-si">Events</span>
            <span className="hd-si">Groups</span>
            <span className="hd-si">Pages</span>
          </div>
          <div className="hd-main">
            <div className="hd-row">
              <span>The Prodigal Son</span>
              <i className="hd-ok">live</i>
            </div>
            <div className="hd-row">
              <span>Rooted in Grace</span>
              <i className="hd-ok">live</i>
            </div>
            <div className="hd-row draft">
              <span>Advent Week 1</span>
              <i className="hd-dr">draft</i>
            </div>
            <div className="hd-add mono">+ new sermon</div>
          </div>
        </div>
      </div>
      <div className="hs-badge alt">
        <b>4</b>
        <span>fields</span>
      </div>
    </div>
  );
}

export default function Hero() {
  const h = DATA.hero;
  return (
    <section id="top" className="hero hero-devices">
      <div className="wrap hero-in">
        <div className="hero-copy">
          <span className="eyebrow">{h.kicker}</span>
          <h1 className="hero-title">
            <span className="ht-l1">
              Custom church websites built by disciples,
            </span>
            <span className="ht-l2 ital">
              <em className="accent"> to disciple.</em>
            </span>
          </h1>
          <p className="hero-sub">{h.sub}</p>
          <div className="hero-actions">
            <a href="#book" className="btn btn-primary">
              {h.primary} <span className="arrow">&rarr;</span>
            </a>
            <a href="#showcase" className="btn btn-ghost">
              &#9654; {h.secondary}
            </a>
          </div>
          {/* <div className="hero-trust">
            <span className="pill">
              <span className="dot live" /> Welcomes new guests
            </span>
            <span className="pill">Disciples your members</span>
            <span className="pill">No monthly fees</span>
          </div>*/}
        </div>
        <div className="hero-visual">
          <HeroDevices />
        </div>
      </div>
    </section>
  );
}
