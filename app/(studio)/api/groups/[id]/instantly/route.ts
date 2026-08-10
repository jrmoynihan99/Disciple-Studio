import { NextResponse } from "next/server";
import { getGroup } from "@/lib/groups";
import {
  cleanGreeting,
  pickRecipient,
  testAddress,
  withGreeting,
  type DemoContacts,
} from "@/lib/leads/engine/outreach";
import { addLead, findLeads, type KnownLead } from "@/lib/leads/server/instantly";

/**
 * A reviewed batch's demos → leads in an Instantly campaign.
 *
 * GET  = the plan, and nothing else. POST = do it.
 *
 * THE TWO SHARE ONE PLANNER, which is the point. A dry run that is built by
 * different code from the real push is a dry run of the wrong thing — the first
 * time they disagree is the first time twenty congregations receive something
 * nobody previewed. `plan()` is called by both, and POST sends exactly the rows
 * GET showed.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

interface PlannedRow {
  churchName: string;
  slug: string;
  demoLink: string;
  /** null when the church has no address at all — reported, never silently dropped. */
  email: string | null;
  firstName: string;
  lastName: string;
  title: string;
  source: "person" | "church_email" | null;
  why: string;
  /** Every address we hold for this church, used for the prior-contact check. */
  allEmails: string[];
  priorContact: (KnownLead & { matchedAddress: string }) | null;
  /** Exactly what the merge tags resolve to. See `variablesFor`. */
  vars: Record<string, string>;
}

/**
 * THE MERGE VARIABLES, IN ONE PLACE.
 *
 * The preview renders these and the push sends these. Building them twice would
 * mean the final review could be reviewing something other than what goes out —
 * which is the one thing a final review must not do. Same argument as `plan()`
 * being shared by GET and POST, one level down.
 *
 * `first_name` is deliberately allowed to be empty; `greeting` is deliberately
 * not. See the note where `greeting` is consumed.
 */
function variablesFor(
  row: Omit<PlannedRow, "vars" | "priorContact">,
  batchId: string,
  batchDate: string,
): Record<string, string> {
  return {
    first_name: row.firstName,
    last_name: row.lastName,
    company_name: row.churchName,
    church_name: row.churchName,
    /**
     * ALWAYS FILLED, WHICH IS THE ENTIRE POINT. Write `Hi {{greeting}},` and it
     * reads on every send.
     *
     * `first_name` is empty on roughly four sends in five — most churches are
     * reached at `info@` or a shared inbox, and a shared inbox deliberately
     * forfeits the name (see `pickRecipient`). The nameless case is the DEFAULT,
     * not the exception, so the opener cannot depend on a merge-tag fallback
     * behaving a particular way in somebody else's template engine. A
     * `{{first_name}}` that fails open is `Hi ,` arriving at a congregation.
     */
    greeting: row.firstName || "there",
    demo_link: row.demoLink,
    demo_slug: row.slug,
    batch_id: batchId,
    batch_date: batchDate,

    /**
     * camelCase ALIASES, because that is what a person actually types.
     *
     * Instantly's own documentation and its AI-SDR campaigns write
     * `{{firstName}}` and `{{companyName}}`, so that is the spelling a template
     * gets written in — and the first campaign written against this integration
     * used `{{firstName}}` and `{{churchName}}` throughout, neither of which
     * existed. A merge tag with no variable behind it does not fail loudly; it
     * sends a gap to a congregation.
     *
     * Two spellings for one value is a cost. It is smaller than the cost of the
     * template being silently wrong, and it is bounded: this list does not grow
     * unless a new variable is added above.
     */
    firstName: row.firstName,
    lastName: row.lastName,
    companyName: row.churchName,
    churchName: row.churchName,
    demoLink: row.demoLink,
  };
}

/** Stamped once per request so every row in a batch carries the same date. */
const today = () => new Date().toISOString().slice(0, 10);

/**
 * THE PUBLIC ORIGIN, not the one the runtime happens to see.
 *
 * `req.url` behind Vercel's proxy can be an internal host, and this string is
 * pasted into an email that goes to a congregation — a demo link on the wrong
 * origin is a dead link at the one moment it matters. The forwarded headers are
 * what the browser actually asked for.
 */
function publicOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

/** Every distinct usable address a church row carries, chosen one first. */
function addressesOf(contacts: unknown, chosen: string | null): string[] {
  const c = (contacts ?? {}) as DemoContacts;
  const all = [
    ...(c.people ?? []).map((p) => p?.email),
    ...(c.church_emails ?? []),
  ]
    .filter((e): e is string => typeof e === "string" && e.includes("@"))
    .map((e) => e.trim().toLowerCase());
  const distinct = [...new Set(all)];
  return chosen ? [chosen, ...distinct.filter((e) => e !== chosen)] : distinct;
}

/**
 * WHAT WOULD BE SENT, WITH THE PRIOR-CONTACT CHECK ALREADY APPLIED.
 *
 * The check asks about EVERY address a church holds, not just the one this push
 * would use. Jason's second round deliberately writes to a different inbox at a
 * church that did not reply — so a check that only knew about the chosen address
 * would call that church "new" and give no warning at all, which is the exact
 * accident it exists to prevent.
 */
async function plan(
  groupId: string,
  origin: string,
  /** Per-church openers typed on the push screen, keyed by demo slug. */
  greetings?: Record<string, string>,
) {
  const group = await getGroup(groupId);
  if (!group) return null;

  const batchDate = today();
  const rows: PlannedRow[] = group.rows.map((r) => {
    const pick = pickRecipient(r.contacts);
    const base = {
      churchName: r.churchName,
      slug: r.slug,
      demoLink: origin + r.demoPath,
      email: pick?.email ?? null,
      firstName: pick?.firstName ?? "",
      lastName: pick?.lastName ?? "",
      title: pick?.title ?? "",
      source: pick?.source ?? null,
      why: pick?.why ?? "no email address anywhere on this church",
      allEmails: addressesOf(r.contacts, pick?.email ?? null),
    };
    return { ...base, priorContact: null, vars: variablesFor(base, groupId, batchDate) };
  });

  /**
   * THE GREETINGS TYPED ON THE PUSH SCREEN, applied to the plan the push sends.
   *
   * They arrive on the POST rather than being stored anywhere: this is a
   * last-moment correction to one send, not a fact about the church — the fact
   * about the church is the greeting in the batch review, which rides in
   * `contacts.greeting_first_name` and is already folded in by `pickRecipient`
   * above. Two different lifetimes, deliberately: one is part of the reviewed
   * record, the other is somebody fixing an opener while looking at it.
   *
   * KEYED BY SLUG, which is the only id this screen has and is unique within a
   * demo group. An entry naming no row is simply ignored.
   */
  for (const row of rows) {
    const typed = greetings?.[row.slug];
    if (typed === undefined) continue;
    const name = cleanGreeting(typed);
    row.firstName = name;
    // Cleared for the same reason `withGreeting` clears it — see there.
    row.lastName = "";
    row.why = name ? "greeting you typed here" : "greeting cleared here — generic opener";
    row.vars = withGreeting(row.vars, name);
  }

  const distinct = [...new Set(rows.flatMap((r) => r.allEmails))];
  const { found, failed } = await findLeads(distinct);

  for (const row of rows) {
    for (const addr of row.allEmails) {
      const hit = found.get(addr);
      if (hit) {
        row.priorContact = { ...hit, matchedAddress: addr };
        break;
      }
    }
  }

  return {
    group,
    rows,
    lookupFailed: failed,
    counts: {
      total: rows.length,
      sendable: rows.filter((r) => r.email).length,
      unreachable: rows.filter((r) => !r.email).length,
      named: rows.filter((r) => r.email && r.firstName).length,
      previouslyContacted: rows.filter((r) => r.priorContact).length,
    },
  };
}

/** GET — the dry run. Reads Instantly, writes nothing. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const result = await plan(id, publicOrigin(req));
    if (!result) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    const { group, ...rest } = result;
    return NextResponse.json({ groupName: group.name, ...rest });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build the plan";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

/**
 * POST — push the batch.
 *
 * `onlyNew` is the middle option behind the warning dialog: push the batch but
 * leave out churches already in Instantly. Defaulting it to false would make
 * "push all" the accidental choice; defaulting to true would silently drop the
 * re-contact Jason explicitly asked to keep possible. So the client always sends
 * it, and this refuses to guess.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;

  let body: {
    campaignId?: unknown;
    onlyNew?: unknown;
    redirectTo?: unknown;
    greetings?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const campaignId = typeof body.campaignId === "string" ? body.campaignId.trim() : "";
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  if (typeof body.onlyNew !== "boolean") {
    return NextResponse.json({ error: "onlyNew must be true or false" }, { status: 400 });
  }
  const onlyNew = body.onlyNew;

  /**
   * TEST MODE, AND IT FAILS CLOSED.
   *
   * An unusable address is a 400 with nothing sent, never a fall-through to the
   * real recipient. The whole value of this flag is the promise that no church
   * receives anything; a silent fallback would break exactly that promise, at
   * exactly the moment somebody believed they were safe.
   */
  if (body.redirectTo !== undefined && typeof body.redirectTo !== "string") {
    return NextResponse.json({ error: "redirectTo must be an email address" }, { status: 400 });
  }
  const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo.trim() : "";
  if (redirectTo && !testAddress(redirectTo, "probe")) {
    return NextResponse.json(
      { error: `"${redirectTo}" is not a usable email address. Nothing was pushed.` },
      { status: 400 },
    );
  }

  /**
   * The typed openers, narrowed before they can reach a merge tag.
   *
   * A malformed map is a 400 rather than a silent drop: the screen showed those
   * names beside the addresses they were going to, and quietly sending the
   * derived ones instead would be the preview lying at the last possible moment.
   * `cleanGreeting` does the character-level work; this only has to establish
   * that the thing is a map of strings and is not a payload.
   */
  let greetings: Record<string, string> | undefined;
  if (body.greetings !== undefined) {
    const raw = body.greetings;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json({ error: "greetings must be an object" }, { status: 400 });
    }
    const entries = Object.entries(raw as Record<string, unknown>);
    if (entries.length > 500 || entries.some(([, v]) => typeof v !== "string")) {
      return NextResponse.json({ error: "greetings must map a slug to a name" }, { status: 400 });
    }
    greetings = Object.fromEntries(entries.map(([k, v]) => [k, v as string]));
  }

  let result;
  try {
    result = await plan(id, publicOrigin(req), greetings);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not build the plan" },
      { status: 503 },
    );
  }
  if (!result) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const pushed: string[] = [];
  const skipped: { churchName: string; reason: string }[] = [];
  const failed: { churchName: string; error: string }[] = [];

  for (const row of result.rows) {
    if (!row.email) {
      skipped.push({ churchName: row.churchName, reason: "no email address" });
      continue;
    }
    if (onlyNew && row.priorContact) {
      skipped.push({ churchName: row.churchName, reason: `already contacted at ${row.priorContact.matchedAddress}` });
      continue;
    }
    /**
     * The redirect swaps ONLY the destination. Greeting, church name and demo
     * link stay exactly as the real send would have them — a test that changes
     * the content is not a test of the content.
     */
    const to = redirectTo ? testAddress(redirectTo, row.slug) : row.email;
    if (!to) {
      failed.push({ churchName: row.churchName, error: "could not build a test address" });
      continue;
    }

    try {
      await addLead(campaignId, {
        email: to,
        first_name: row.firstName || undefined,
        last_name: row.lastName || undefined,
        company_name: row.churchName,
        /**
         * THE SAME OBJECT THE PREVIEW RENDERED. `first_name` and `last_name` are
         * also sent as native Instantly fields above; repeating them here is
         * harmless and keeps one definition of the merge namespace.
         */
        custom_variables: row.vars,
      });
      pushed.push(row.churchName);
    } catch (e) {
      failed.push({
        churchName: row.churchName,
        error: e instanceof Error ? e.message.slice(0, 200) : "unknown error",
      });
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    campaignId,
    /** Echoed back so the result screen can state plainly that no church was written to. */
    redirectedTo: redirectTo || null,
    pushed: pushed.length,
    pushedNames: pushed,
    skipped,
    failed,
    lookupFailed: result.lookupFailed,
  });
}
