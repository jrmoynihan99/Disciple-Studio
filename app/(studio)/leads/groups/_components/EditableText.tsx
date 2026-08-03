"use client";

import { useEffect, useRef, useState } from "react";
import { useReadOnly } from "./ReadOnly";

/**
 * Click the text, fix the text.
 *
 * It buffers locally while focused and commits ONCE on blur (or Enter, for a
 * single line), rather than firing an operation per keystroke. The store would
 * survive the latter — the ops are idempotent and fold to the same value — but
 * twenty operations to change one word makes the "3 changes pending" counter
 * meaningless, and that counter is how someone knows whether it is safe to close
 * the tab.
 *
 * Escape restores the buffer and gives up focus, so an edit begun by accident
 * costs nothing.
 */
export function EditableText({
  value,
  onCommit,
  multiline,
  placeholder,
  className,
  emptyClassName,
  editingClassName,
  restingClassName,
  ariaLabel,
  disabled,
}: {
  value: string;
  onCommit: (next: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  /** Styling for the EMPTY state only. Defaults to the muted placeholder look;
   *  pass this where an absent value is something the reviewer must act on. */
  emptyClassName?: string;
  /**
   * The open field's chrome, and the resting button's hover, as two overrides.
   *
   * The review page renders this component in three different design languages,
   * and the defaults below are console tokens — an `--lead-*` border on a page
   * painted in `--fg`/`--surface` is the one place a skin would leak. Everything
   * that is BEHAVIOUR (the buffer, the commit-on-blur, the padding that is the
   * click target) is deliberately not overridable.
   */
  editingClassName?: string;
  restingClassName?: string;
  ariaLabel: string;
  disabled?: boolean;
}) {
  /**
   * The draft exists ONLY while editing, seeded from `value` at the moment the
   * field opens. Keeping a mirrored copy the rest of the time would need an
   * effect to re-sync it whenever the value changed underneath — from a revert,
   * or from another tab — and that effect would eventually fire mid-edit and
   * pull the text out from under the cursor.
   */
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  /**
   * Frozen by the batch, or frozen by this call site — the same thing to draw.
   *
   * Read from context so a sent batch cannot leave one field editable because a
   * prop was missed at one of thirty call sites. See `ReadOnly.tsx`.
   */
  const locked = useReadOnly();
  const frozen = !!disabled || locked;

  useEffect(() => {
    if (!editing || !multiline) return;
    const el = ref.current;
    if (el instanceof HTMLTextAreaElement) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editing, draft, multiline]);

  const commit = () => {
    const next = draft;
    setDraft(null);
    if (next !== null && next !== value) onCommit(next);
  };
  const cancel = () => setDraft(null);

  /**
   * `py-1`, not `py-1.5`. A review sheet renders roughly thirty of these per
   * church, so four pixels of padding each is ~250px of column height per church
   * — measured, and the single largest thing standing between a reviewer and a
   * second church on the screen. It stays non-zero: the padding is the click
   * target, and this is a control you hit with a mouse on a line of text.
   */
  const shared =
    "w-full px-2 py-1 text-inherit font-[inherit] leading-[inherit] outline-none " +
    (editingClassName ?? "rounded-md border border-lead-brand bg-lead-bg text-lead-ink");

  if (editing && !frozen) {
    return multiline ? (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        autoFocus
        value={draft ?? ""}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
        className={`${shared} resize-none overflow-hidden ${className ?? ""}`}
      />
    ) : (
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        autoFocus
        value={draft ?? ""}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") cancel();
        }}
        className={`${shared} ${className ?? ""}`}
      />
    );
  }

  /**
   * A FROZEN VALUE IS NOT A BUTTON.
   *
   * `<button disabled>` would still read as a control to a screen reader and
   * still announce "Edit church name" for something nobody can edit. On a sent
   * batch there is no edit to offer, so what is drawn is the text.
   */
  if (frozen) {
    return (
      <div
        className={`w-full px-2 py-1 text-left ${
          value ? "" : (emptyClassName ?? "text-lead-ink2 italic opacity-60")
        } ${className ?? ""}`}
      >
        {value || placeholder || "—"}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Edit ${ariaLabel}`}
      onClick={() => setDraft(value)}
      // Dotted underline on hover, no permanent box: forty cards of outlined
      // fields reads as a form to fill in rather than a proof sheet to check.
      //
      // `cursor-text`, not the pointer the base rule would give any other
      // button. This one turns into a text field, and a caret is the honest
      // answer to "what will this click do".
      // `emptyClassName` overrides the muted default. It exists because the
      // default deliberately RECEDES — most empty fields on this sheet are
      // ordinary and should not shout — while a missing church NAME or SLOGAN is
      // the reviewer's job to fix, and `opacity-60` was quietly draining the
      // colour out of the treatment that says so.
      className={`w-full cursor-text rounded-md px-2 py-1 text-left transition-colors ${
        restingClassName ?? "hover:bg-lead-panel2"
      } ${value ? "" : (emptyClassName ?? "text-lead-ink2 italic opacity-60")} ${className ?? ""}`}
    >
      {value || placeholder || "—"}
    </button>
  );
}
