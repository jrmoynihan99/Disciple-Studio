import { DATA } from "@/app/data";

export default function Founders() {
  const f = DATA.founders;
  return (
    <section id="founders" className="founders-sec section-pad">
      <div className="wrap">
        <div className="founders-grid">
          <div className="founders-intro">
            <span className="eyebrow">{f.eyebrow}</span>
            <h2 className="sec-title">{f.title}</h2>
            <p className="founders-body">{f.body}</p>
          </div>
          <div className="founders-people">
            {f.people.map((p, i) => (
              <div key={i} className="founder">
                <div className="founder-photo">
                  <span className="mono">portrait</span>
                </div>
                <div className="founder-info">
                  <div className="founder-name serif">{p.name}</div>
                  <div className="founder-role mono">{p.role}</div>
                  <p className="founder-bio">{p.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
