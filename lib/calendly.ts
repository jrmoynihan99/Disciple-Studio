/**
 * Calendly Scheduling API — server only. CALENDLY_API_TOKEN is an
 * account-scoped credential that must never reach the browser; everything
 * here is called from route handlers, never imported into a client component.
 *
 * Ported from decypher-website (same token, same account). Payload shapes
 * were verified against the live API rather than the docs. That matters:
 * Calendly silently ignores unknown request fields, so a wrong guess doesn't
 * error — it books successfully with the answers dropped on the floor. Don't
 * "tidy" these shapes without re-verifying against a real booking.
 */

const API = "https://api.calendly.com";

/**
 * The one event this site books: calendly.com/jrmoynihan99/30min — the
 * "20 Min Discovery Call" (the slug predates the duration change). Fixed on
 * the server on purpose: the token can see every event type on the account,
 * so nothing client-supplied is ever allowed to pick one.
 */
export const EVENT_TYPE_URI = `${API}/event_types/e850dcf5-0b43-4c43-b790-44129fecd873`;

export type QuestionType =
  | "string"
  | "text"
  | "phone_number"
  | "single_select"
  | "multi_select";

/** A custom question as configured on the event type in Calendly. */
export interface CalendlyQuestion {
  name: string;
  type: QuestionType;
  position: number;
  enabled: boolean;
  required: boolean;
  answer_choices: string[];
  include_other: boolean;
}

export interface EventTypeInfo {
  uri: string;
  name: string;
  duration: number;
  /** Must be echoed back on booking — Calendly rejects a mismatched kind. */
  locationKind: string;
  questions: CalendlyQuestion[];
}

export interface Slot {
  startTime: string;
  inviteesRemaining: number;
}

export interface BookingResult {
  eventUri: string;
  startTime: string;
  cancelUrl: string;
  rescheduleUrl: string;
}

/* ---- the slices of Calendly's responses this module actually reads ---- */

interface EventTypeResource {
  uri: string;
  name: string;
  duration: number;
  locations?: { kind: string }[];
  custom_questions?: CalendlyQuestion[];
}

interface SlotResource {
  start_time: string;
  status: string;
  invitees_remaining: number;
}

interface InviteeResource {
  event: string;
  cancel_url: string;
  reschedule_url: string;
}

export class CalendlyError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: { parameter?: string; message?: string }[] = [],
  ) {
    super(message);
    this.name = "CalendlyError";
  }
}

/* ===================== transport ===================== */

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) throw new CalendlyError("CALENDLY_API_TOKEN is not set", 500);

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new CalendlyError(
      body?.message ?? body?.title ?? res.statusText,
      res.status,
      body?.details ?? [],
    );
  }
  return body as T;
}

/* ===================== reads ===================== */

/**
 * The event type plus its custom questions. Fetched per request rather than
 * baked in, so edits made in Calendly show up on the site without a deploy —
 * which is the whole point of rendering the form from this data.
 */
export async function getEventType(uri: string): Promise<EventTypeInfo> {
  const uuid = uri.split("/").pop();
  const { resource } = await api<{ resource: EventTypeResource }>(
    `/event_types/${uuid}`,
  );
  return {
    uri: resource.uri,
    name: resource.name,
    duration: resource.duration,
    locationKind: resource.locations?.[0]?.kind ?? "",
    questions: (resource.custom_questions ?? []).filter((q) => q.enabled),
  };
}

/**
 * Bookable slots over the next `days` days (Calendly rejects a start_time in
 * the past, so the horizon opens slightly ahead of now).
 *
 * The endpoint only honours a range of up to 7 days — ask for more and it
 * quietly answers as if you'd asked for a week (verified live: a 14-day
 * request and a 7-day request return identical collections). So the horizon
 * is covered in week-sized windows fetched in parallel and merged. How much
 * of the horizon has slots is then purely the event type's own scheduling
 * window, set in Calendly ("invitees can schedule N days into the future") —
 * widen it there and the picker's month arrows light up with no code change.
 */
export async function getAvailableTimes(
  eventTypeUri: string,
  days = 60,
): Promise<Slot[]> {
  const WEEK = 7 * 86_400_000;
  const from = Date.now() + 60_000;
  const to = from + days * 86_400_000;

  const windows: { start: string; end: string }[] = [];
  for (let t = from; t < to; t += WEEK) {
    windows.push({
      start: new Date(t).toISOString(),
      end: new Date(Math.min(t + WEEK, to)).toISOString(),
    });
  }

  // One flaky window shouldn't blank the whole picker: keep what resolved,
  // fail only when nothing did. A missing mid-horizon week shows as "no times
  // that week", which self-heals on the next load.
  const results = await Promise.allSettled(
    windows.map((w) =>
      api<{ collection: SlotResource[] }>(
        `/event_type_available_times?event_type=${encodeURIComponent(eventTypeUri)}` +
          `&start_time=${encodeURIComponent(w.start)}&end_time=${encodeURIComponent(w.end)}`,
      ),
    ),
  );
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  if (!fulfilled.length && results.length) {
    throw (results[0] as PromiseRejectedResult).reason;
  }
  if (fulfilled.length < results.length) {
    console.warn(
      `[calendly] ${results.length - fulfilled.length}/${results.length} availability windows failed — showing partial availability`,
    );
  }

  // Windows meet at exact boundary instants, so a slot can land in two
  // responses — dedupe by start. ISO-Z strings sort chronologically.
  const seen = new Set<string>();
  const slots: Slot[] = [];
  for (const r of fulfilled) {
    for (const s of r.value.collection) {
      if (s.status !== "available" || seen.has(s.start_time)) continue;
      seen.add(s.start_time);
      slots.push({
        startTime: s.start_time,
        inviteesRemaining: s.invitees_remaining,
      });
    }
  }
  return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/* ===================== write ===================== */

export interface CreateBookingInput {
  eventTypeUri: string;
  /** Must exactly match a slot from getAvailableTimes, UTC with trailing Z. */
  startTime: string;
  name: string;
  email: string;
  /** IANA zone, e.g. "America/New_York". */
  timezone: string;
  locationKind: string;
  answers: { question: string; answer: string; position: number }[];
}

/**
 * Creates a real booking on the host's calendar.
 *
 * `location` is top-level (NOT nested under `event`, despite what the
 * validation error path suggests) and its `kind` must match the kind
 * configured on the event type or Calendly rejects with
 * invalid_location_choice.
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<BookingResult> {
  const { resource } = await api<{ resource: InviteeResource }>("/invitees", {
    method: "POST",
    body: JSON.stringify({
      event_type: input.eventTypeUri,
      start_time: input.startTime,
      invitee: {
        name: input.name,
        email: input.email,
        timezone: input.timezone,
      },
      location: { kind: input.locationKind },
      questions_and_answers: input.answers,
    }),
  });
  return {
    eventUri: resource.event,
    startTime: input.startTime,
    cancelUrl: resource.cancel_url,
    rescheduleUrl: resource.reschedule_url,
  };
}
