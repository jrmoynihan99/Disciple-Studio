"use client";

/**
 * The right-hand panel chrome: scrim, surface, and the entrance transition.
 *
 * IT EXISTS SO THE ANIMATION DOES NOT REPLAY ON EVERY j/k.
 *
 * The dossier is mounted with `key={orgId}` on purpose — stepping to another
 * church has to give a genuinely fresh component, or the previous church's
 * evidence paints for a frame under the new church's name. But that key would
 * also remount the panel itself, so the whole thing would slide in again on
 * every keypress while walking a list.
 *
 * Splitting them fixes it by reconciliation: this component keeps the same
 * position and type for as long as anything is open, so React never unmounts
 * it, and only the keyed child inside is torn down and rebuilt.
 *
 * Shared with the export-history panel when that lands, which is also why the
 * Esc handling lives here rather than in the dossier.
 */
export function SlideOver({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* The scrim is the click target for "dismiss", so it must cover the list
          — but it is deliberately not a focus trap: reading a dossier and then
          tabbing back out to the filters is a real thing to want. */}
      <div className="lead-scrim fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside
        aria-label={label}
        className="lead-slideover fixed top-0 right-0 z-50 flex h-dvh w-[480px] max-w-[94vw] flex-col border-l border-lead-line bg-lead-bg shadow-2xl"
      >
        {children}
      </aside>
    </>
  );
}
