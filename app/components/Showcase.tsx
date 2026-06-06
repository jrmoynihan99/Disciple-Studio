import { DATA } from "@/app/data";

export default function Showcase() {
  const s = DATA.showcase;
  const t = DATA.testimonial;
  return (
    <section id="showcase" className="showcase-sec section-pad">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">{s.eyebrow}</span>
          <h2 className="sec-title">{s.title}</h2>
          <p className="sec-sub">{s.sub}</p>
        </div>
        <a className="show-card" href={s.url} target="_blank" rel="noreferrer">
          <div className="show-preview">
            <div className="sp-chrome mono">
              <span className="tl" />
              <span className="tl" />
              <span className="tl" />
              {s.urlLabel}
            </div>
            <div className="sp-shot">
              <span className="mono">live site screenshot</span>
            </div>
            <div className="show-visit">
              Visit live site <span className="arrow">&nearr;</span>
            </div>
          </div>
          <div className="show-meta">
            <div>
              <div className="show-church serif">{s.church}</div>
              <div className="show-loc mono">{s.location}</div>
            </div>
            <div className="show-stats">
              {s.stats.map((x, i) => (
                <div key={i} className="show-stat">
                  <b className="serif">{x.k}</b>
                  <span>{x.v}</span>
                </div>
              ))}
            </div>
          </div>
        </a>
        <figure className="testi">
          <blockquote className="serif">&ldquo;{t.quote}&rdquo;</blockquote>
          <figcaption>
            <b>{t.name}</b>
            <span>{t.role}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
