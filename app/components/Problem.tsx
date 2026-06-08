import { DATA } from "@/app/data";

export default function Problem() {
  const p = DATA.problem;
  return (
    <section id="why" className="problem-sec section-pad">
      <div className="wrap">
        <div className="sec-head center">
          <span className="eyebrow">{p.eyebrow}</span>
          <h2 className="sec-title">{p.title}</h2>
        </div>
        <div className="prob-grid">
          {p.pain.map((x, i) => (
            <div key={i} className="prob-card">
              <div className="prob-top">
                <span className="prob-idx mono">{"0" + (i + 1)}</span>
                <span className="prob-tag mono">{x.tag}</span>
              </div>
              <h4 className="serif">{x.k}</h4>
              <p>{x.v}</p>
            </div>
          ))}
        </div>
        <div className="prob-belief">
          <span className="eyebrow">{p.beliefLabel}</span>
          <h3 className="prob-highlight serif">
            The lack of deeper,{" "}
            <em className="accent">personalized discipleship.</em>
          </h3>
        </div>
      </div>
    </section>
  );
}
