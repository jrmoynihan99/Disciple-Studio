"use client";

import {
  FieldError,
  PhoneInput,
  TextArea,
  TextInput,
} from "@/app/(site)/components/schedule/fields";
import type { CalendlyQuestion } from "@/lib/calendly";

/**
 * Renders the event type's custom questions straight from Calendly, in our
 * own fields. Nothing here is hardcoded to the current questions — edit, add,
 * reorder, or remove a question in Calendly and this follows on the next
 * request with no deploy. That's the reason the form is data-driven rather
 * than hand-built.
 *
 * The tradeoff is that an unknown question type has to degrade rather than
 * crash: anything unrecognised renders as a plain text field, which still
 * collects an answer Calendly will accept.
 */

/** Answers keyed by question position. Multi-selects hold a joined string. */
export type Answers = Record<number, string>;

const OTHER = "__other__";

const rowCls =
  "flex cursor-pointer items-start gap-3 rounded-[12px] border px-3 py-[11px] transition-colors duration-150";
const rowOn = "border-accent-soft/55 bg-accent-soft/[.10]";
const rowOff = "border-paper/15 bg-paper/[0.04] hover:border-accent-soft/40";

/**
 * A multi-select's picks live in one string, so the joiner has to be
 * something a choice can never contain — and ", " isn't, since choices can be
 * full sentences with commas. A unit separator can't appear in a Calendly
 * choice or in typed "Other" text, so the round-trip is lossless.
 */
const SEP = String.fromCharCode(31); // ASCII unit separator
const split = (v: string) => (v ? v.split(SEP).filter(Boolean) : []);
// Deduped on the way in, so a pick can't appear twice however it got there —
// including "Other" text typed to match a choice that's already ticked.
const join = (list: string[]) => Array.from(new Set(list)).join(SEP);

/**
 * The form's internal encoding → what Calendly actually gets: comma-joined
 * the way its own multi-selects are, with the unfilled "Other" placeholder
 * dropped rather than booked as literal "__other__". A single-value answer
 * round-trips unchanged, so every question type can go through this.
 */
export const toCalendlyAnswer = (value: string | undefined) =>
  split(value ?? "")
    .filter((s) => s !== OTHER)
    .join(", ");

export default function CalendlyQuestions({
  questions,
  answers,
  onChange,
  errors,
}: {
  questions: CalendlyQuestion[];
  answers: Answers;
  onChange: (position: number, value: string) => void;
  errors: Record<number, boolean>;
}) {
  return (
    <div className="flex flex-col gap-5">
      {questions.map((q) => {
        const id = `q-${q.position}`;
        const value = answers[q.position] ?? "";
        const invalid = !!errors[q.position];

        return (
          <div key={q.position}>
            {/* Questions are full sentences from Calendly — sentence case,
                not the uppercase treatment the fixed NAME/EMAIL labels get. */}
            <label
              className="mb-2 block font-mono text-[12px] font-medium leading-snug text-paper/65"
              htmlFor={id}
            >
              {q.name}
              {!q.required && <span className="text-paper/40"> (optional)</span>}
            </label>

            {q.type === "text" ? (
              <TextArea
                id={id}
                value={value}
                invalid={invalid}
                onChange={(e) => onChange(q.position, e.target.value)}
              />
            ) : q.type === "phone_number" ? (
              <PhoneInput
                id={id}
                value={value}
                invalid={invalid}
                onChange={(v) => onChange(q.position, v)}
                placeholder="(555) 123-4567"
              />
            ) : q.type === "single_select" || q.type === "multi_select" ? (
              <ChoiceList
                q={q}
                value={value}
                invalid={invalid}
                onChange={(v) => onChange(q.position, v)}
              />
            ) : (
              <TextInput
                id={id}
                type="text"
                value={value}
                invalid={invalid}
                onChange={(e) => onChange(q.position, e.target.value)}
              />
            )}

            <FieldError show={invalid}>This one&apos;s required.</FieldError>
          </div>
        );
      })}
    </div>
  );
}

/**
 * single_select renders as radios, multi_select as checkboxes. Deliberately
 * not pills — choices can be full sentences, and pills turn long copy into
 * unreadable blobs.
 */
function ChoiceList({
  q,
  value,
  invalid,
  onChange,
}: {
  q: CalendlyQuestion;
  value: string;
  invalid: boolean;
  onChange: (v: string) => void;
}) {
  const multi = q.type === "multi_select";
  const selected = multi ? split(value) : value ? [value] : [];

  // "Other" is free text, so anything not in answer_choices is the other value.
  const otherValue = selected.find((s) => !q.answer_choices.includes(s)) ?? "";
  const otherOn = q.include_other && !!otherValue;

  const toggle = (choice: string) => {
    if (!multi) return onChange(choice === value ? "" : choice);
    const next = selected.includes(choice)
      ? selected.filter((s) => s !== choice)
      : [...selected, choice];
    onChange(join(next));
  };

  const setOther = (text: string) => {
    const kept = selected.filter((s) => q.answer_choices.includes(s));
    if (!multi) return onChange(text);
    onChange(join(text ? [...kept, text] : kept));
  };

  return (
    <div
      className={`flex flex-col gap-2 ${invalid ? "rounded-[12px] ring-1 ring-[#f87171]" : ""}`}
    >
      {q.answer_choices.map((choice) => {
        const on = selected.includes(choice);
        return (
          <label key={choice} className={`${rowCls} ${on ? rowOn : rowOff}`}>
            <input
              type={multi ? "checkbox" : "radio"}
              name={`q-${q.position}`}
              checked={on}
              onChange={() => toggle(choice)}
              className="mt-1 flex-none accent-accent"
            />
            <span
              className={`text-[15px] leading-snug ${on ? "text-paper" : "text-paper/70"}`}
            >
              {choice}
            </span>
          </label>
        );
      })}

      {q.include_other && (
        <div className={`${rowCls} flex-col ${otherOn ? rowOn : rowOff}`}>
          <div className="flex w-full items-center gap-3">
            <input
              type={multi ? "checkbox" : "radio"}
              name={`q-${q.position}`}
              checked={otherOn}
              onChange={() => setOther(otherOn ? "" : OTHER)}
              className="flex-none accent-accent"
            />
            <span className="text-[15px] text-paper/70">Other</span>
          </div>
          {otherOn && (
            <input
              type="text"
              autoFocus
              value={otherValue === OTHER ? "" : otherValue}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Tell us more"
              className="mt-2 w-full rounded-[9px] border border-paper/15 bg-paper/[0.04] px-3 py-2 font-sans text-[15px] text-paper outline-none placeholder:text-paper/35 focus:border-accent-soft"
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * True when a required question has no usable answer yet. Judged on what
 * would actually be sent, so a checked-but-empty "Other" reads as unanswered
 * whether it's the only pick or sits alongside real ones.
 */
export function isUnanswered(q: CalendlyQuestion, value: string | undefined) {
  if (!q.required) return false;
  return !toCalendlyAnswer(value).trim();
}
