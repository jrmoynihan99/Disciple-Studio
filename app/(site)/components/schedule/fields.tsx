"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Form primitives for the booking panel, in the site's night palette.
 * Ported from decypher-website's estimator fields — the caret-preserving
 * phone formatter is the part worth keeping verbatim.
 */

export const fieldLabelCls =
  "mb-2 block font-mono text-[10.5px] font-bold uppercase tracking-[1.2px] text-paper/60";

/* Error red stays cool on purpose — on this warm palette a warm red is
   indistinguishable from the accent, and an error has to read as one. */
const invalidCls = "border-[#f87171] shadow-[0_0_0_3px_rgba(248,113,113,0.14)]";

const inputBase =
  "w-full rounded-[12px] border bg-paper/[0.04] px-3 py-[11px] font-sans text-base text-paper outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-paper/35 focus:border-accent-soft focus:shadow-[0_0_0_3px_rgba(224,118,79,0.16)]";

export function FieldError({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return <div className="mt-1.5 text-xs text-[#f87171]">{children}</div>;
}

export function TextInput({
  invalid,
  className = "",
  ...props
}: React.ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      className={`${inputBase} ${invalid ? invalidCls : "border-paper/15"} ${className}`}
    />
  );
}

export function TextArea({
  invalid,
  className = "",
  ...props
}: React.ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      className={`${inputBase} min-h-[110px] resize-y ${invalid ? invalidCls : "border-paper/15"} ${className}`}
    />
  );
}

/**
 * Caret-preserving formatted input: applies `format` to the raw value on each
 * change and keeps the caret anchored to the same digit it was next to.
 */
function useFormattedInput(
  onChange: (v: string) => void,
  format: (raw: string) => { out: string; digitsShift?: number },
) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const raw = el.value;
    const caretPos = el.selectionStart ?? raw.length;
    let digitsBefore = raw.slice(0, caretPos).replace(/\D/g, "").length;
    const { out, digitsShift } = format(raw);
    if (digitsShift) digitsBefore = Math.max(0, digitsBefore + digitsShift);
    let pos = 0;
    let seen = 0;
    while (pos < out.length && seen < digitsBefore) {
      if (/\d/.test(out[pos])) seen++;
      pos++;
    }
    // sync the DOM immediately (in case React skips a re-render), then let
    // the layout effect restore the caret after any re-render
    el.value = out;
    try {
      el.setSelectionRange(pos, pos);
    } catch {}
    caret.current = pos;
    onChange(out);
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (caret.current != null && el && document.activeElement === el) {
      try {
        el.setSelectionRange(caret.current, caret.current);
      } catch {}
    }
    caret.current = null;
  });

  return { ref, handleChange };
}

export function formatPhoneString(raw: string): {
  out: string;
  digitsShift: number;
} {
  let d = raw.replace(/\D/g, "");
  let digitsShift = 0;
  if (d.length === 11 && d.charAt(0) === "1") {
    d = d.slice(1);
    digitsShift = -1;
  }
  d = d.slice(0, 10); // US 10-digit
  let out = "";
  if (d.length > 6) out = `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  else if (d.length > 3) out = `(${d.slice(0, 3)}) ${d.slice(3)}`;
  else if (d.length > 0) out = `(${d}`;
  return { out, digitsShift };
}

/** US phone input formatted as (555) 123-4567. */
export function PhoneInput({
  id,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  const { ref, handleChange } = useFormattedInput(onChange, formatPhoneString);
  return (
    <input
      ref={ref}
      id={id}
      type="tel"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      className={`${inputBase} ${invalid ? invalidCls : "border-paper/15"}`}
    />
  );
}
