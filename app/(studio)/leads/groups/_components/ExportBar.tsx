"use client";

/**
 * The acknowledgement, the export button, and — once sent — the receipt.
 *
 * Its own component so `/leads/audit` can mount the real thing and assert what
 * arms the button. The review page is client-rendered, so scraping its server
 * HTML would find a loading skeleton and pass without checking anything — the
 * same trap that already caught the row-hover check once.
 *
 * THE BUTTON USED TO BE PERMANENTLY INERT, and the audit asserted exactly that.
 * It is live now, so the guarantee moved rather than disappeared: the tick is the
 * gate, and a sent batch renders no export control at all.
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
  onExport,
  blocked,
  sent,
  demoGroupId,
  skin = CONSOLE_EXPORT_BAR,
}: {
  count: number;
  acknowledged: boolean;
  onAcknowledge: (on: boolean) => void;
  onExport: () => void;
  /**
   * Why the export cannot run right now, in words a reviewer can act on — or
   * `undefined` when nothing is in the way.
   *
   * THE TICK IS NO LONGER THE ONLY GATE, and pretending otherwise is what this
   * prop fixes. A batch whose saves are failing renders "offline — 3 held" in the
   * nav bar while the export button sits fully armed beside it; the export reads
   * the batch from the SERVER, so pressing it there builds demos from a version
   * of the batch missing the last three corrections. The acknowledgement gates
   * "has a person read this"; this gates "does the server have what they read".
   */
  blocked?: string;
  /** Already sent. The bar becomes a receipt rather than a control. */
  sent: boolean;
  demoGroupId?: string;
  skin?: ExportBarSkin;
}) {
  /**
   * A SENT BATCH HAS NO EXPORT CONTROL AT ALL — not a disabled one.
   *
   * Disabling it would leave the reviewer looking for the condition that would
   * re-enable it, and there is none: the demos exist, and the way back to them is
   * the link. A control that can never become live is not a control.
   */
  if (sent) {
    return (
      <div className={skin.box}>
        <p className="text-[13px] text-lead-ink">
          This batch has been sent. {count} church{count === 1 ? "" : "es"} became demo sites.
        </p>
        {demoGroupId && (
          <a
            href={`/studio/g/${demoGroupId}`}
            className={`mt-3 inline-flex ${skin.button}`}
          >
            Open the demos →
          </a>
        )}
      </div>
    );
  }

  /** All three gates in one place, so the button and its dressing cannot disagree. */
  const armed = acknowledged && count > 0 && !blocked;

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
        {/* THE TICK IS THE GATE, and now it actually arms something.

            It was inert for as long as there was no downstream — deliberately, and
            it said so. There is one now, so the acknowledgement stops being a
            gesture: it is the last thing between a reviewer and twenty real
            churches receiving a site built from data nobody checked.

            `cursor-not-allowed` and `opacity-40` are appended AFTER the skin so no
            language can dress the un-armed state up as live. `/leads/audit`
            measures the computed cursor in both states. */}
        <button
          type="button"
          data-group-export
          disabled={!armed}
          onClick={onExport}
          title={
            blocked
              ? blocked
              : count === 0
                ? "There is nothing in this batch to send."
                : acknowledged
                  ? "Generate a demo site for every church in this batch"
                  : "Confirm you have read the batch first"
          }
          className={`${skin.button} ${armed ? "" : "cursor-not-allowed opacity-40"}`}
        >
          Export group
        </button>
        <p className={skin.note}>
          Generates a demo per church from exactly what you see here — your
          corrections included, struck-out items excluded.
        </p>
      </div>

      {/* THE REASON IS ON SCREEN, not only in a `title`. A blocked export is the
          one disabled state a reviewer cannot work out for themselves — an
          unticked box explains itself and an empty batch is visible, but "the
          server does not have your last three edits" is invisible from here. */}
      {blocked && (
        <p data-export-blocked className={`mt-2 ${skin.note} text-lead-bad`}>
          {blocked}
        </p>
      )}
    </div>
  );
}
