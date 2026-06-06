import { DATA } from "@/app/data";

export default function Pricing() {
  const p = DATA.pricing;
  return (
    <section id="pricing" className="pricing-sec section-pad">
      <div className="wrap">
        <div className="pricing-card">
          <div className="pricing-left">
            <span className="eyebrow">{p.eyebrow}</span>
            <h2 className="sec-title">{p.title}</h2>
            <p className="pricing-sub">{p.sub}</p>
            <a href="#book" className="btn btn-primary">
              Book a call <span className="arrow">&rarr;</span>
            </a>
          </div>
          <div className="pricing-right">
            {p.rows.map((r, i) => (
              <div key={i} className="price-row">
                <span>{r.k}</span>
                <span className={`price-v${r.v === "$0" ? " zero" : ""}`}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
