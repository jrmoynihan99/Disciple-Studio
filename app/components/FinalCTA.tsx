import { DATA } from "@/app/data";

export default function FinalCTA() {
  const c = DATA.finalCta;
  return (
    <section id="book" className="cta-sec">
      <div className="wrap cta-in">
        <h2 className="cta-title serif">
          {c.title[0]}
          <br />
          <span className="ital">{c.title[1]}</span>
        </h2>
        <p className="cta-sub">{c.sub}</p>
        <div className="cta-actions">
          <a href="/book" className="btn btn-primary">
            {c.primary} <span className="arrow">&rarr;</span>
          </a>
          <a
            href="https://aletheia-website-seven.vercel.app/"
            className="btn btn-ghost light"
          >
            &#9654; {c.secondary}
          </a>
        </div>
      </div>
    </section>
  );
}
