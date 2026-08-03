import { AuditRunner } from "./AuditRunner";

/**
 * The honesty audit, run in the real DOM.
 *
 * The engine tests in `lib/leads/engine/tests/` prove the DATA is right. They
 * cannot prove the RENDERING is: that `unver` actually paints hatched, that
 * every quote on screen shows a source link, that ◎ has no click handler, that
 * no "Q7" string reaches a salesperson. Those need a browser.
 *
 * This is the surface the end-of-build checklist is walked on, and it is
 * dev-only — it mounts every dossier to inspect it, which is not something to
 * ship.
 */
export default function AuditPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <p className="p-10 font-mono text-sm">
        The audit surface is available in development only.
      </p>
    );
  }
  return <AuditRunner />;
}
