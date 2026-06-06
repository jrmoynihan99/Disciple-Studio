"use client";

import { useState, useEffect, useRef } from "react";
import { DATA } from "@/app/data";

/* ---------- shared hooks ---------- */
function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const isMobile = window.innerWidth <= 940;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold: isMobile ? 0.01 : 0.12, rootMargin: isMobile ? "0px" : "0px 0px -8% 0px" }
    );
    io.observe(el);
    const t = setTimeout(() => setInView(true), 800);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);
  return [ref, inView] as const;
}

function useCycle(max: number, ms: number, on: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setI((v) => (v + 1) % max), ms);
    return () => clearInterval(t);
  }, [on, max, ms]);
  return i;
}

function useTypewriter(text: string, on: boolean, key: number) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!on) {
      setOut(text);
      return;
    }
    setOut("");
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      i++;
      setOut(text.slice(0, i));
      if (i < text.length) t = setTimeout(tick, 55);
    };
    t = setTimeout(tick, 350);
    return () => clearTimeout(t);
  }, [on, key, text]);
  return out;
}

/* ---------- demo chrome ---------- */
function DemoFrame({ children, bar }: { children: React.ReactNode; bar: string }) {
  return (
    <div className="demo-frame">
      <div className="demo-bar">
        <span className="tl" />
        <span className="tl" />
        <span className="tl" />
        <div className="demo-barlabel mono">{bar}</div>
      </div>
      <div className="demo-body">{children}</div>
    </div>
  );
}

/* ---- 01: Modern ---- */
const SITE_BLOCKS = [
  { t: "Welcome to Grace", s: "hero", h: 78 },
  { t: "Plan your visit", s: "split", h: 52 },
  { t: "Latest sermons", s: "grid", h: 56 },
  { t: "Find a group", s: "cards", h: 52 },
  { t: "Give", s: "band", h: 40 },
];

function Gauge({ on }: { on: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!on) {
      setV(0);
      return;
    }
    let raf: number;
    let start: number | undefined;
    const dur = 1400;
    const target = 99;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(e * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <div className="gauge">
      <svg viewBox="0 0 80 80" width="78" height="78">
        <circle cx="40" cy="40" r={R} fill="none" stroke="var(--line)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C - C * (v / 100)}
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset .2s linear" }}
        />
      </svg>
      <div className="gauge-num">
        {v}
        <small>perf</small>
      </div>
    </div>
  );
}

function DemoModern({ on }: { on: boolean }) {
  const [built, setBuilt] = useState(1);
  useEffect(() => {
    if (!on) return;
    setBuilt(1);
    let n = 1;
    const t = setInterval(() => {
      n = n >= SITE_BLOCKS.length ? 1 : n + 1;
      setBuilt(n);
    }, 950);
    return () => clearInterval(t);
  }, [on]);
  return (
    <DemoFrame bar="gracecommunity.example">
      <div className="modern-wrap">
        <div className="site-canvas">
          {SITE_BLOCKS.map((b, i) => (
            <div
              key={i}
              className={`site-block sb-${b.s}${i < built ? " shown" : ""}`}
              style={{ height: b.h, transitionDelay: i === built - 1 ? ".05s" : "0s" }}
            >
              <span className="sb-label">{b.t}</span>
              {b.s === "grid" && (
                <div className="sb-grid">
                  <i />
                  <i />
                  <i />
                </div>
              )}
              {b.s === "cards" && (
                <div className="sb-grid">
                  <i />
                  <i />
                </div>
              )}
            </div>
          ))}
          <div className="site-add">+ section</div>
        </div>
        <div className="modern-side">
          <Gauge on={on} />
          <div className="ms-stat">
            <b>0.4s</b>
            <span>load time</span>
          </div>
          <div className="ms-stat">
            <b>&infin;</b>
            <span>room to grow</span>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}

/* ---- 02: CMS ---- */
const CMS_SCENES = [
  { title: "The Prodigal Son", speaker: "Pastor James", series: "Parables", featured: true },
  { title: "Rooted in Grace", speaker: "Pastor Dana", series: "Ephesians", featured: false },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="cms-field">
      <span className="cms-flabel">{label}</span>
      <span className="cms-input">{children}</span>
    </label>
  );
}

function DemoCMS({ on }: { on: boolean }) {
  const scene = useCycle(CMS_SCENES.length, 3600, on);
  const data = CMS_SCENES[scene];
  const typed = useTypewriter(data.title, on, scene);
  return (
    <DemoFrame bar="studio &middot; sermons">
      <div className="cms-wrap">
        <div className="cms-form">
          <div className="cms-formhead mono">New sermon</div>
          <Field label="Title">
            <span className="cms-typed">
              {typed}
              <i className="caret" />
            </span>
          </Field>
          <Field label="Speaker">{data.speaker}</Field>
          <Field label="Series">{data.series}</Field>
          <div className="cms-toggle-row">
            <span>Feature on homepage</span>
            <span className={`cms-switch${data.featured ? " is-on" : ""}`}>
              <i />
            </span>
          </div>
          <div className="cms-note mono">4 fields. That&rsquo;s the whole form.</div>
        </div>
        <div className="cms-preview">
          <div className="cms-pv-label mono">Live preview</div>
          <div className="pv-card">
            {data.featured && <span className="pv-badge">Featured</span>}
            <div className="pv-thumb">
              <span className="mono">sermon art</span>
            </div>
            <div className="pv-series mono">{data.series}</div>
            <div className="pv-title serif">{typed || "\u2026"}</div>
            <div className="pv-meta">
              {data.speaker} &middot; Sun
            </div>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}

/* ---- 03: Sync ---- */
const SYNC_EVENTS = [
  { t: "Sunday Worship", d: "Sun \u00B7 10am", c: "#bb4a23" },
  { t: "Youth Night", d: "Wed \u00B7 7pm", c: "#345044" },
  { t: "Women\u2019s Bible Study", d: "Thu \u00B7 9am", c: "#8a6d2f" },
  { t: "Membership Class", d: "Sat \u00B7 1pm", c: "#3a5878" },
];

function DemoSync({ on }: { on: boolean }) {
  const [phase, setPhase] = useState(0);
  const [idx, setIdx] = useState(0);
  const [placed, setPlaced] = useState([0]);

  useEffect(() => {
    if (!on) return;
    let i = 0;
    setPlaced([0]);
    setIdx(0);
    setPhase(0);
    const loop = () => {
      i = (i + 1) % SYNC_EVENTS.length;
      setIdx(i);
      setPhase(1);
      setTimeout(() => {
        setPhase(2);
        setPlaced((p) => [...p, i].slice(-4));
      }, 900);
      setTimeout(() => setPhase(0), 1500);
    };
    const t = setInterval(loop, 2400);
    return () => clearInterval(t);
  }, [on]);

  const ev = SYNC_EVENTS[idx];
  return (
    <DemoFrame bar="sync &middot; planning center &rarr; website">
      <div className="sync-wrap">
        <div className="sync-col">
          <div className="sync-head">
            <span className="sync-app pc">PC</span> Planning Center
          </div>
          <div className="sync-list">
            {SYNC_EVENTS.map((e, i) => (
              <div key={i} className={`sync-item${i === idx && phase >= 1 ? " active" : ""}`}>
                <span className="si-dot" style={{ background: e.c }} />
                <span>{e.t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="sync-mid">
          <div className="sync-wire" />
          <div className={`sync-pkt${phase === 1 ? " go" : ""}`}>
            <span className="si-dot" style={{ background: ev.c }} />
            {ev.t}
          </div>
          <div className="sync-engine mono">
            SANITY
            <br />
            <small>auto-sync</small>
          </div>
        </div>
        <div className="sync-col">
          <div className="sync-head">
            <span className="sync-app web">&nearr;</span> Your website
          </div>
          <div className="sync-cal">
            {placed.map((p, i) => {
              const e = SYNC_EVENTS[p];
              return (
                <div key={i} className="cal-ev pop" style={{ borderColor: e.c }}>
                  <b style={{ color: e.c }}>{e.d}</b>
                  <span>{e.t}</span>
                </div>
              );
            })}
          </div>
          <div className="sync-foot mono">No double entry. Ever.</div>
        </div>
      </div>
    </DemoFrame>
  );
}

/* ---- 04: Login / Member Portal ---- */
const STEPS = [
  { t: "Attend a Sunday gathering", s: "done" },
  { t: "Get baptized", s: "done" },
  { t: "Join a community group", s: "now" },
  { t: "Take the membership class", s: "next" },
  { t: "Find a place to serve", s: "next" },
];

function DemoLogin({ on }: { on: boolean }) {
  const [screen, setScreen] = useState("login");

  useEffect(() => {
    if (!on) return;
    const seq: [string, number][] = [
      ["login", 1300],
      ["loading", 700],
      ["dash", 4800],
    ];
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      setScreen(seq[i][0]);
      timer = setTimeout(() => {
        i = (i + 1) % seq.length;
        run();
      }, seq[i][1]);
    };
    run();
    return () => clearTimeout(timer);
  }, [on]);

  return (
    <DemoFrame bar="grace &middot; member portal">
      <div className="mp">
        {screen === "login" && (
          <div className="mp-login">
            <div className="mp-login-card">
              <div className="mp-logo serif">Grace</div>
              <div className="mp-login-sub">Member sign in</div>
              <div className="mp-field mono">sarah@email.com</div>
              <div className="mp-field mono">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</div>
              <div className="mp-signin">Sign in</div>
            </div>
          </div>
        )}
        {screen === "loading" && (
          <div className="mp-loading">
            <div className="spinner2" />
          </div>
        )}
        {screen === "dash" && (
          <div className="mp-dash">
            <div className="mp-top">
              <span className="mp-brand serif">Grace</span>
              <span className="mp-nav">
                <i />
                <i />
                <i />
              </span>
              <span className="mp-user">
                <span className="mp-avatar">S</span>Sarah
              </span>
            </div>
            <div className="mp-greet">
              Welcome back, <b className="serif">Sarah.</b>
            </div>
            <div className="mp-grid">
              <div className="mp-card mp-stepscard">
                <span className="mp-label mono">YOUR NEXT STEPS</span>
                <div className="mp-steps">
                  {STEPS.map((s, i) => (
                    <div
                      key={i}
                      className={`mstep ms-${s.s}`}
                      style={{ animationDelay: i * 80 + "ms" }}
                    >
                      <span className="mstep-mark">{s.s === "done" ? "\u2713" : ""}</span>
                      <span className="mstep-t">{s.t}</span>
                      {s.s === "now" && <span className="mstep-tag">You&rsquo;re here</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mp-side">
                <div className="mp-card">
                  <span className="mp-label mono">YOUR GROUP</span>
                  <div className="mp-gtitle">Tuesday Women&rsquo;s Group</div>
                  <div className="mp-gmeta">Next: Tue 7:00pm &middot; Hosted by Beth</div>
                </div>
                <div className="mp-card mp-give">
                  <span className="mp-label mono">THIS YEAR</span>
                  <div className="mp-givenum serif">$1,240</div>
                  <div className="mp-gmeta">in generosity &middot; thank you</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DemoFrame>
  );
}

/* ---- 05: NoCode ---- */
const BLOCKS_LIB = [
  { t: "Christmas Eve", i: "\u2726" },
  { t: "Sermon series", i: "\u25A4" },
  { t: "Staff directory", i: "\u274D" },
  { t: "Event landing", i: "\u25C7" },
];

function DemoNoCode({ on }: { on: boolean }) {
  const [step, setStep] = useState(0);
  const pick = useCycle(BLOCKS_LIB.length, 2600, on);

  useEffect(() => {
    if (!on) return;
    setStep(0);
    const a = setTimeout(() => setStep(1), 700);
    const b = setTimeout(() => setStep(2), 1500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [on, pick]);

  const b = BLOCKS_LIB[pick];
  return (
    <DemoFrame bar="studio &middot; page builder">
      <div className="nc-wrap">
        <div className="nc-lib">
          <div className="nc-libhead mono">Blocks</div>
          {BLOCKS_LIB.map((x, i) => (
            <div key={i} className={`nc-block${i === pick && step >= 1 ? " lift" : ""}`}>
              <span className="nc-ico">{x.i}</span>
              {x.t}
            </div>
          ))}
        </div>
        <div className="nc-canvas">
          <div className="nc-existing">Home</div>
          <div className="nc-existing">About</div>
          <div className={`nc-drop${step === 2 ? " filled" : ""}`}>
            {step === 2 ? (
              <div className="nc-newblock pop">
                <span className="nc-ico">{b.i}</span>
                {b.t}
                <span className="nc-pub mono">published</span>
              </div>
            ) : (
              <span className="nc-dz mono">drop a block here</span>
            )}
          </div>
          <div className={`nc-cursor${step >= 1 ? " moved" : ""}`}>&blacktriangledown;</div>
        </div>
      </div>
      <div className="nc-foot mono">No code. No waiting on a developer. No invoice.</div>
    </DemoFrame>
  );
}

/* ---- 06: Free ---- */
function DemoFree({ on }: { on: boolean }) {
  const [month, setMonth] = useState(0);
  useEffect(() => {
    if (!on) {
      setMonth(0);
      return;
    }
    setMonth(0);
    let m = 0;
    const t = setInterval(() => {
      m = m >= 12 ? 0 : m + 1;
      setMonth(m);
    }, 480);
    return () => clearInterval(t);
  }, [on]);
  const perMo = 199;
  const theirs = month * perMo;
  return (
    <DemoFrame bar="cost over 12 months">
      <div className="free-wrap">
        <div className="free-row">
          <div className="free-side">
            <div className="free-label">Typical platform</div>
            <div className="free-amt their">${theirs.toLocaleString()}</div>
            <div className="free-sub mono">${perMo}/mo &middot; month {month}</div>
            <div className="free-bar">
              <div className="free-fill their" style={{ width: (month / 12) * 100 + "%" }} />
            </div>
          </div>
          <div className="free-side">
            <div className="free-label">Disciple Studio</div>
            <div className="free-amt ours">$0</div>
            <div className="free-sub mono">built once, owned forever</div>
            <div className="free-bar">
              <div className="free-fill ours" style={{ width: "3%" }} />
            </div>
          </div>
        </div>
        <div className="free-stamp serif">
          That&rsquo;s ${(perMo * 12).toLocaleString()}/yr
          <br />
          back in the ministry.
        </div>
      </div>
    </DemoFrame>
  );
}

/* ---------- demo registry ---------- */
const DEMOS: Record<string, React.ComponentType<{ on: boolean }>> = {
  modern: DemoModern,
  cms: DemoCMS,
  sync: DemoSync,
  login: DemoLogin,
  nocode: DemoNoCode,
  free: DemoFree,
};

/* ---------- Feature row ---------- */
function FeatureRow({ f, i }: { f: (typeof DATA.features)[number]; i: number }) {
  const [ref, inView] = useInView();
  const Demo = DEMOS[f.id];
  const flip = i % 2 === 1;
  return (
    <div ref={ref} className={`feat-row${flip ? " flip" : ""}${inView ? " in" : ""}`}>
      <div className="feat-copy">
        <div className="feat-n mono">
          <span>{f.n}</span>
          <em>{f.tag}</em>
        </div>
        <h3 className="feat-title">{f.title}</h3>
        <p className="feat-body">{f.body}</p>
        <ul className="feat-points">
          {f.points.map((p, k) => (
            <li key={k}>
              <span className="fp-tick">{"\u2713"}</span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="feat-demo">{Demo && <Demo on={inView} />}</div>
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="features-sec section-pad">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">What we build</span>
          <h2 className="sec-title">
            Everything it takes to do both jobs &mdash;
            <br />
            <span className="ital">and run itself while it does.</span>
          </h2>
        </div>
        <div className="feat-list">
          {DATA.features.map((f, i) => (
            <FeatureRow key={f.id} f={f} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
