"use client";

import { useEffect, useState } from "react";
import {
  FieldError,
  TextInput,
  fieldLabelCls,
} from "@/app/(site)/components/schedule/fields";
import CalendlyQuestions, {
  type Answers,
  isUnanswered,
  toCalendlyAnswer,
} from "@/app/(site)/components/schedule/CalendlyQuestions";
import TimePicker, {
  BROWSER_TZ,
} from "@/app/(site)/components/schedule/TimePicker";
import type { CalendlyQuestion } from "@/lib/calendly";

/**
 * Books a real call on the calendar — our own two-step take on the flow the
 * Calendly embed used to run inside its iframe:
 *
 *   1. pick a time   — live availability straight from the API
 *   2. your details  — name, email, and the event's own custom questions
 *
 * Step 2's questions are driven entirely by what Calendly returns, so edits
 * made there land here without a deploy (see CalendlyQuestions). Which event
 * gets booked is pinned server-side — the client never says.
 */

interface Loaded {
  eventType: { name: string; duration: number };
  questions: CalendlyQuestion[];
  slots: { startTime: string; inviteesRemaining: number }[];
}

export interface Booked {
  email: string;
  startTime: string;
  duration: number;
  rescheduleUrl: string;
  cancelUrl: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const whenFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/* Same look as components/ui's Btn, at row scale and as real <button>s. */
const navBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3 font-sans text-[14.5px] [font-weight:580] tracking-[-0.01em] transition-[translate,background-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] active:translate-y-px disabled:cursor-default disabled:opacity-40";
const navPrimary = `${navBase} flex-1 bg-accent text-white hover:bg-accent-deep disabled:hover:bg-accent`;
const navGhost = `${navBase} flex-none bg-transparent text-paper shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--color-paper)_30%,transparent)] hover:shadow-[inset_0_0_0_1.5px_var(--color-paper)]`;

export default function ScheduleCall({
  onBooked,
}: {
  /* Lets the page take over the moment the booking lands (e.g. /book swaps
     its whole hero to the thank-you). Without it, the confirmation renders
     inline in the widget's own frame. */
  onBooked?: (booked: Booked) => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Answers>({});

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [qErrors, setQErrors] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);

  const clearErr = (k: string) =>
    setErrors((e) => (e[k] ? { ...e, [k]: false } : e));

  // Retries re-run the effect by bumping this; all setState stays inside the
  // promise callbacks (react-hooks/set-state-in-effect rejects anything
  // synchronous in the effect body, including via a helper function).
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    fetch("/api/booking")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't load times.");
        if (!stale) setLoaded(data);
      })
      .catch((e) => {
        if (!stale) {
          setLoadError(
            e instanceof Error ? e.message : "Something went wrong.",
          );
        }
      });
    return () => {
      stale = true;
    };
  }, [attempt]);

  const retry = () => {
    setLoadError(null);
    setAttempt((a) => a + 1);
  };

  const submitBooking = async () => {
    if (!loaded || !slot) return;

    const errs: Record<string, boolean> = {};
    if (!name.trim()) errs.name = true;
    if (!EMAIL_RE.test(email.trim())) errs.email = true;
    setErrors(errs);

    const qe: Record<number, boolean> = {};
    for (const q of loaded.questions) {
      if (isUnanswered(q, answers[q.position])) qe[q.position] = true;
    }
    setQErrors(qe);
    if (Object.keys(errs).length || Object.keys(qe).length) return;

    setBusy(true);
    setFailure(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          timezone: BROWSER_TZ,
          startTime: slot,
          answers: loaded.questions.map((q) => ({
            question: q.name,
            // Held in the form's own encoding — decode before it leaves.
            answer: toCalendlyAnswer(answers[q.position]),
            position: q.position,
          })),
        }),
      });
      const data = await res.json();

      if (res.status === 409) {
        // someone took the slot while this form was open — send them back
        // with fresh availability rather than a dead end
        setFailure(data.error);
        setSlot(null);
        const refresh = await fetch("/api/booking");
        if (refresh.ok) setLoaded(await refresh.json());
        setStep(1);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Couldn't book that.");

      const confirmed: Booked = {
        email: email.trim(),
        startTime: slot,
        duration: data.eventType.duration,
        rescheduleUrl: data.booking.rescheduleUrl,
        cancelUrl: data.booking.cancelUrl,
      };
      setBooked(confirmed);
      onBooked?.(confirmed);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (booked) return <Confirmation booked={booked} />;

  return (
    <div className="flex min-h-[440px] flex-col">
      {loaded && (
        <div className="mb-6 flex-none">
          {/* The call's name, straight from Calendly — the panel leads with
              what you're booking, not with form chrome. */}
          <h2 className="m-0 font-serif text-[clamp(24px,2.4vw,29px)] leading-[1.12] tracking-[-0.02em] [font-weight:460] text-paper">
            {loaded.eventType.name}
          </h2>
          <p className="m-0 mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-paper/50">
            {loaded.eventType.duration} min · Google Meet
          </p>
          <div className="mt-5">
            <Steps step={step} />
          </div>
          {step === 2 && slot && (
            <p className="m-0 mt-5 rounded-[12px] border border-paper/12 bg-paper/[0.04] px-3 py-[11px] font-mono text-[12px] tracking-[0.06em] text-paper/70">
              {whenFmt.format(new Date(slot))} · {loaded.eventType.duration} MIN
            </p>
          )}
        </div>
      )}

      {!loaded && !loadError && (
        <div className="grid flex-1 place-items-center">
          <span className="animate-pulse font-mono text-xs tracking-[0.05em] text-paper/45">
            loading calendar…
          </span>
        </div>
      )}

      {loadError && (
        <div className="grid flex-1 place-items-center">
          <div className="text-center">
            <p className="m-0 text-sm text-paper/70">{loadError}</p>
            <button type="button" onClick={retry} className={`${navGhost} mt-4`}>
              Try again
            </button>
          </div>
        </div>
      )}

      {loaded && step === 1 && (
        <TimePicker slots={loaded.slots} value={slot} onChange={setSlot} />
      )}

      {loaded && step === 2 && (
        <div className="grid gap-4">
          <div>
            <label className={fieldLabelCls} htmlFor="s-name">
              Name
            </label>
            <TextInput
              id="s-name"
              type="text"
              placeholder="Your name"
              value={name}
              invalid={!!errors.name}
              onChange={(e) => {
                setName(e.target.value);
                clearErr("name");
              }}
            />
            <FieldError show={!!errors.name}>
              Please enter your name.
            </FieldError>
          </div>

          <div>
            <label className={fieldLabelCls} htmlFor="s-email">
              Email
            </label>
            <TextInput
              id="s-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              invalid={!!errors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearErr("email");
              }}
            />
            <FieldError show={!!errors.email}>
              Please enter a valid email.
            </FieldError>
          </div>

          <CalendlyQuestions
            questions={loaded.questions}
            answers={answers}
            errors={qErrors}
            onChange={(pos, v) => {
              setAnswers((a) => ({ ...a, [pos]: v }));
              setQErrors((e) => (e[pos] ? { ...e, [pos]: false } : e));
            }}
          />
        </div>
      )}

      {loaded && (
        <div className="mt-6 flex flex-none gap-3 border-t border-paper/10 pt-5">
          {step === 2 && (
            <button
              type="button"
              className={navGhost}
              onClick={() => setStep(1)}
              disabled={busy}
            >
              ← Back
            </button>
          )}
          {step === 1 ? (
            <button
              type="button"
              className={navPrimary}
              onClick={() => setStep(2)}
              disabled={!slot}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className={navPrimary}
              onClick={submitBooking}
              disabled={busy}
            >
              {busy ? "Booking…" : "Book my call →"}
            </button>
          )}
        </div>
      )}

      {failure && (
        <p className="mt-4 flex-none text-center text-sm text-[#f87171]">
          {failure}
        </p>
      )}
    </div>
  );
}

function Steps({ step }: { step: 1 | 2 }) {
  const labels = ["Time", "Details"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2;
        const done = n < step;
        const on = n === step;
        const last = i === labels.length - 1;
        return (
          // The last label carries no connector, so leaving it flex-1 would
          // let it hog half the row and strand the rail short of the edge.
          // Pinning it to its content lets the rule absorb the slack and the
          // rail runs the full width.
          <div
            key={label}
            className={`flex items-center gap-2 ${last ? "flex-none" : "flex-1"}`}
          >
            <span
              className={`font-mono text-[10.5px] font-bold uppercase tracking-[1.2px] ${
                on ? "text-accent-soft" : done ? "text-paper/70" : "text-paper/40"
              }`}
            >
              {String(n).padStart(2, "0")} {label}
            </span>
            {i < labels.length - 1 && (
              <span
                className={`h-px flex-1 ${done ? "bg-accent-soft/50" : "bg-paper/12"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Confirmation({ booked }: { booked: Booked }) {
  return (
    <div className="grid min-h-[440px] place-items-center animate-fade-in">
      <div className="max-w-[380px] text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent/15">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent-soft)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="mt-5 font-serif text-[30px] leading-[1.1] tracking-[-0.02em] [font-weight:460]">
          You&rsquo;re booked.
        </h2>
        <p className="mt-3 font-mono text-[12.5px] tracking-[0.06em] text-paper/70">
          {whenFmt.format(new Date(booked.startTime))} · {booked.duration} MIN
        </p>
        <p className="mt-4 text-[15px] leading-[1.6] text-paper/70">
          A calendar invite with your Google Meet link is on its way to{" "}
          <span className="text-paper">{booked.email}</span>. Talk soon!
        </p>
        <div className="mt-6 flex items-center justify-center gap-5 text-[13.5px]">
          <a
            href={booked.rescheduleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-soft underline underline-offset-[3px] transition-colors hover:text-accent-glow"
          >
            Reschedule
          </a>
          <a
            href={booked.cancelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-paper/50 underline underline-offset-[3px] transition-colors hover:text-paper/80"
          >
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}
