import { DATA } from "@/app/data";

export default function Backends() {
  return (
    <section className="integ-sec">
      <div className="hero-marquee">
        <span className="marq-label mono">
          {DATA.backendsLead} <i>&rarr;</i>
        </span>
        <div className="marq-viewport" aria-hidden="true">
          <div className="marq-track">
            {[0, 1].map((r) => (
              <span key={r} className="marq-group">
                {DATA.backends.map((b) => (
                  <span key={b} className="marq-item">
                    {b}
                    <i>{"\u2726"}</i>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
