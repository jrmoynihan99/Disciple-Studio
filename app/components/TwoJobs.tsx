import { DATA } from "@/app/data";

export default function TwoJobs() {
  const t = DATA.twoJobs;
  return (
    <section id="what" className="twojobs-sec section-pad">
      <div className="wrap">
        <div className="sec-head center">
          <span className="eyebrow">{t.eyebrow}</span>
          <h2 className="sec-title">{t.title}</h2>
          <p className="sec-sub" style={{ marginLeft: "auto", marginRight: "auto" }}>
            {t.intro}
          </p>
        </div>
        <div className="tj-grid">
          {t.jobs.map((j, i) => (
            <div key={i} className={`tj-card${j.tag === "Disciple" ? " tj-dark" : ""}`}>
              <div className="tj-top">
                <span className="tj-n mono">{j.n}</span>
                <span className="tj-tag">{j.tag}</span>
              </div>
              <div className="tj-sub serif">{j.sub}</div>
              <p className="tj-body">{j.body}</p>
              <ul className="tj-points">
                {j.points.map((p, k) => (
                  <li key={k}>
                    <span className="tj-tick">&rarr;</span>
                    {p}
                  </li>
                ))}
              </ul>
              <div className="tj-outcome">
                <span className="mono">THE RESULT</span>
                <b className="serif">{j.outcome}</b>
              </div>
            </div>
          ))}
        </div>
        <p className="tj-kicker serif ital">{t.kicker}</p>
      </div>
    </section>
  );
}
