"use client";

import { useEffect, useRef } from "react";

/**
 * "Are you sure?" for the things you cannot take back.
 *
 * WHY A DIALOG AT ALL, WHEN MOST OF THIS PAGE IS UNDOABLE.
 *
 * Striking a step out is revertible — it stays on the card wearing a `put back`
 * button — and a control like that should never stop to ask. Removing a CHURCH is
 * not: the entry holds the frozen snapshot plus every correction typed into it,
 * and for a church that has since left the dataset the card says in as many words
 * that it is the only copy we hold. There is no re-pull behind it. The same is
 * true of deleting an item somebody added by hand: nothing generated it, so
 * nothing can regenerate it.
 *
 * `<dialog>` rather than a hand-rolled overlay, because the browser gives us the
 * things a bespoke one gets wrong: the top layer (so no z-index fight with the
 * sticky header), a real focus trap, inert content behind it, and Escape. The one
 * behaviour added here is closing on a backdrop click, which `<dialog>` does not
 * do on its own.
 *
 * DESTRUCTIVE IS THE DEFAULT-*UN*FOCUSED BUTTON. Enter on an unchanged dialog
 * cancels; confirming is a deliberate second gesture. That is the whole point of
 * the stop.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  /** What is actually about to be lost. Name the thing, not the action. */
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  /**
   * `showModal()` is imperative and cannot be expressed as a prop, so this is one
   * of the few effects that genuinely belongs: it syncs a DOM-owned mode with
   * React state rather than deriving state from state.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // `cancel` fires on Escape; without this the dialog would close in the DOM
      // while React still believed it open, and the next open would no-op.
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // The backdrop is the dialog element itself — clicks on the content land
        // on a child, so target===currentTarget means "outside".
        if (e.target === e.currentTarget) onCancel();
      }}
      className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-xl border border-lead-line bg-lead-panel p-0 text-lead-ink backdrop:bg-black/50"
    >
      <div className="p-5">
        <h2 className="font-serif text-[19px] leading-snug font-semibold text-lead-ink">{title}</h2>
        <div className="mt-2 text-[13.5px] leading-relaxed text-lead-ink2">{body}</div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-lg border border-lead-line bg-lead-panel px-3.5 font-mono text-[11px] text-lead-ink2 transition-colors hover:border-lead-ink2 hover:text-lead-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-9 items-center rounded-lg bg-lead-bad px-3.5 font-mono text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
