import { NextResponse } from "next/server";
import { getGroup } from "@/lib/groups";
import { pickRecipient, type DemoContacts } from "@/lib/leads/engine/outreach";
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
}

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
async function plan(groupId: string, origin: string) {
  const group = await getGroup(groupId);
  if (!group) return null;

  const rows: PlannedRow[] = group.rows.map((r) => {
    const pick = pickRecipient(r.contacts);
    return {
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
      priorContact: null,
    };
  });

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

  let body: { campaignId?: unknown; onlyNew?: unknown };
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

  let result;
  try {
    result = await plan(id, publicOrigin(req));
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

  const batchDate = new Date().toISOString().slice(0, 10);

  for (const row of result.rows) {
    if (!row.email) {
      skipped.push({ churchName: row.churchName, reason: "no email address" });
      continue;
    }
    if (onlyNew && row.priorContact) {
      skipped.push({ churchName: row.churchName, reason: `already contacted at ${row.priorContact.matchedAddress}` });
      continue;
    }
    try {
      await addLead(campaignId, {
        email: row.email,
        first_name: row.firstName || undefined,
        last_name: row.lastName || undefined,
        company_name: row.churchName,
        custom_variables: {
          /**
           * The demo link is the whole message. It is a custom variable rather
           * than part of the body so one campaign can serve every batch.
           */
          demo_link: row.demoLink,
          church_name: row.churchName,
          demo_slug: row.slug,
          /**
           * ALWAYS FILLED, WHICH IS THE ENTIRE POINT. Write `Hi {{greeting}},`
           * and it reads correctly on every send.
           *
           * `first_name` is empty on roughly four sends in five — most churches
           * are reached at `info@` or a shared inbox, and a shared inbox
           * deliberately forfeits the name (see `pickRecipient`). That makes the
           * nameless case the DEFAULT, not the exception, so the opener cannot
           * depend on a merge-tag fallback rendering correctly in somebody
           * else's template engine. `{{first_name}}` failing open means "Hi ,"
           * arriving at a congregation.
           *
           * Computed here, from the same rule the tests cover, so the greeting
           * in the email matches the one the preview showed.
           */
          greeting: row.firstName || "there",
          // Cohort tags: Jason runs two standing campaigns, so per-batch analytics
          // have to come from filtering inside one rather than from its name.
          batch_id: id,
          batch_date: batchDate,
        },
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
    pushed: pushed.length,
    pushedNames: pushed,
    skipped,
    failed,
    lookupFailed: result.lookupFailed,
  });
}
