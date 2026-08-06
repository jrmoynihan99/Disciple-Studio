import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  CalendlyError,
  createBooking,
  EVENT_TYPE_URI,
  getAvailableTimes,
  getEventType,
} from "@/lib/calendly";

export const dynamic = "force-dynamic";

/**
 * The /book flow's server side. Everything Calendly happens here — the API
 * token can see and book every event type on the account, so it would be a
 * full-account credential in the browser.
 *
 * GET   → the discovery call's name/duration, its questions, its open slots
 * POST  → creates the booking, returns reschedule/cancel URLs
 *
 * Which event gets booked is fixed in lib/calendly.ts (EVENT_TYPE_URI) and
 * never read from the request. Questions come from Calendly on every GET, so
 * edits made there land on the site without a deploy.
 */

export async function GET() {
  try {
    const [eventType, slots] = await Promise.all([
      getEventType(EVENT_TYPE_URI),
      getAvailableTimes(EVENT_TYPE_URI),
    ]);
    return NextResponse.json({
      eventType: { name: eventType.name, duration: eventType.duration },
      questions: eventType.questions,
      slots,
    });
  } catch (e) {
    return errorResponse(e, "Couldn't load available times.");
  }
}

interface BookingRequest {
  name?: string;
  email?: string;
  timezone?: string;
  startTime?: string;
  answers?: { question: string; answer: string; position: number }[];
}

export async function POST(req: NextRequest) {
  let body: BookingRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { name, email, timezone, startTime, answers } = body;

  if (!name || !email || !timezone || !startTime) {
    const missing = (["name", "email", "timezone", "startTime"] as const).filter(
      (k) => !body[k],
    );
    return NextResponse.json(
      { error: `Missing: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  // Calendly rejects a blank answer outright ("must be filled") — an
  // unanswered optional question has to be omitted, not sent empty.
  const filled = (Array.isArray(answers) ? answers : []).filter(
    (a) => typeof a?.answer === "string" && a.answer.trim() !== "",
  );

  try {
    // Re-read the event type rather than trusting the client for locationKind:
    // a mismatched kind is rejected by Calendly, and this is one round trip.
    const eventType = await getEventType(EVENT_TYPE_URI);

    const booking = await createBooking({
      eventTypeUri: EVENT_TYPE_URI,
      startTime,
      name,
      email,
      timezone,
      locationKind: eventType.locationKind,
      answers: filled,
    });

    return NextResponse.json({
      booking,
      eventType: { name: eventType.name, duration: eventType.duration },
    });
  } catch (e) {
    return errorResponse(e, "Couldn't complete your booking.");
  }
}

/**
 * Calendly's 4xx bodies are developer-facing, so they don't go to the
 * visitor. Two cases are worth translating rather than swallowing.
 */
function errorResponse(e: unknown, fallback: string) {
  if (e instanceof CalendlyError) {
    console.error(`[booking] Calendly ${e.status}: ${e.message}`, e.details);

    // A slot lost between load and submit — a normal race on a busy calendar,
    // not the visitor's fault. The client only ever posts times it got from
    // GET, so a start_time complaint here means the slot went away.
    if (e.details.some((d) => d.parameter === "start_time")) {
      return NextResponse.json(
        {
          error: "That time was just booked by someone else. Pick another.",
          code: "slot_taken",
        },
        { status: 409 },
      );
    }

    // Calendly enforces its own required questions. Reaching this means our
    // renderer let a required one through — most likely a question type it
    // doesn't know about, which it degrades to a text field.
    if (/required questions/i.test(e.message)) {
      return NextResponse.json(
        { error: "Please answer all required questions.", code: "answers" },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: fallback }, { status: 502 });
  }

  console.error("[booking] unexpected", e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
