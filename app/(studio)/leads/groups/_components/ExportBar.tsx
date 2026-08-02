"use client";

/**
 * The acknowledgement and the (inert) export button.
 *
 * Its own component so `/leads/audit` can mount the real thing and assert the
 * button is still disabled. The review page is client-rendered, so scraping its
 * server HTML would find a loading skeleton and pass without checking anything —
 * the same trap that already caught the row-hover check once.
 */
/**
 * Class strings only. `data-group-export`, `disabled` and the absence of an
 * `href` are the contract, not styling, and no skin can reach them.
 */
export interface ExportBarSkin {
  box: string;
  label: string;
  accent: string;
  button: string;
  note: string;
}

export const CONSOLE_EXPORT_BAR: ExportBarSkin = {
  box: "mt-10 rounded-xl border border-lead-line bg-lead-panel px-5 py-4",
  label: "flex cursor-pointer items-start gap-2.5 text-[13px] text-lead-ink",
  accent: "accent-[var(--lead-brand)]",
  button: "rounded-md bg-lead-brand px-4 py-2 font-mono text-xs text-white",
  note: "font-mono text-[10px] leading-relaxed text-lead-ink2",
};

export function ExportBar({
  count,
  acknowledged,
  onAcknowledge,
  skin = CONSOLE_EXPORT_BAR,
}: {
  count: number;
  acknowledged: boolean;
  onAcknowledge: (on: boolean) => void;
  skin?: ExportBarSkin;
}) {
  return (
    <div className={skin.box}>
      <label className={skin.label}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => onAcknowledge(e.target.checked)}
          className={`mt-0.5 ${skin.accent}`}
        />
        <span>
          I have read all {count} church{count === 1 ? "" : "es"} above and corrected
          what was wrong.
        </span>
      </label>

      <div className="mt-3 flex items-center gap-3">
        {/* Inert BY DESIGN, and it says why. A disabled control with no
            explanation reads as a bug; one that names what it is waiting for
            reads as a plan. The tick deliberately does not arm it — there is no
            downstream to arm.

            `cursor-not-allowed` and `opacity-40` are appended AFTER the skin, so
            no language can dress this up as a live button by accident. The audit
            measures the computed cursor. */}
        <button
          type="button"
          data-group-export
          disabled
          title="Export is not built yet — it will generate demos from this group."
          className={`${skin.button} cursor-not-allowed opacity-40`}
        >
          Export group
        </button>
        <p className={skin.note}>
          Not wired up yet. Export will generate a demo per church from exactly what
          you see here — struck-out items excluded.
        </p>
      </div>
    </div>
  );
}
