import { DATA } from "@/app/data";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap foot-in">
        <div className="foot-brand">
          <span className="brand-mark">{"\u271D"}</span>
          <span className="brand-name serif">Disciple Studio</span>
          <p className="foot-tag">{DATA.tagline}</p>
        </div>
        <div className="foot-links">
          {DATA.nav.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
          <a href="/book">Book a call</a>
        </div>
        <div className="foot-bottom mono">
          <span>&copy; 2026 Disciple Studio &middot; For the local church</span>
        </div>
      </div>
    </footer>
  );
}
