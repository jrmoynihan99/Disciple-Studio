import "server-only";

/**
 * The Instantly API, and the only file that knows it exists.
 *
 * WHY THE SEQUENCES ARE NOT IN THIS APP. Instantly already owns multi-step
 * delays, A/B variants, sending windows, mailbox rotation and stop-on-reply, and
 * the copy has to reach it to be sent at all — so it is the source of truth for
 * what an email says whatever we build. A second editor here would not remove
 * that round trip, it would add a way for the two to disagree.
 *
 * What this app owns instead is the half Instantly cannot do: turning a REVIEWED
 * batch into correctly addressed leads. Which contact, which greeting, which demo
 * link, and whether we have written to this church before.
 */

const BASE = "https://api.instantly.ai/api/v2";

/** Named so the preflight can say which variable, matching the R2 preflight. */
function apiKey(): string {
  const key = process.env.INSTANTLY_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "instantly: INSTANTLY_API_KEY is not set. Add it to .env.local locally and to the " +
        "host environment in production; nothing can be pushed without it.",
    );
  }
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    /**
     * THE STATUS ALONE IS NOT THE ERROR. A 400 from this API carries the field it
     * disliked, and swallowing that into "Instantly returned 400" turns a
     * one-line fix into a debugging session against somebody else's API.
     */
    throw new Error(`instantly: ${init?.method ?? "GET"} ${path} → ${res.status} ${text.slice(0, 400)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export interface Campaign {
  id: string;
  name: string;
  status: number;
  /** True when the campaign has at least one step with a body — see `stepCount`. */
  hasSteps: boolean;
  stepCount: number;
}

interface RawCampaign {
  id: string;
  name: string;
  status: number;
  sequences?: { steps?: { delay?: number; variants?: { subject?: string; body?: string }[] }[] }[];
}

/**
 * Every campaign in the account, newest API page first.
 *
 * THE LIST IS NOT FILTERED. Jason asked for whatever is in Instantly so he can
 * add campaigns without touching this code, and a filter here would mean a
 * campaign that exists but does not appear — which reads as "the integration is
 * broken", not "your campaign is paused". `status` and `stepCount` ride along so
 * the picker can WARN instead of hiding.
 */
export async function listCampaigns(): Promise<Campaign[]> {
  const body = await call<{ items?: RawCampaign[] }>("/campaigns?limit=100");
  return (body.items ?? []).map((c) => {
    const steps = (c.sequences ?? []).flatMap((s) => s.steps ?? []);
    const written = steps.filter((s) =>
      (s.variants ?? []).some((v) => (v.body ?? "").trim() || (v.subject ?? "").trim()),
    );
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      stepCount: written.length,
      hasSteps: written.length > 0,
    };
  });
}

export interface SequenceStep {
  /** 1-based, as a person counts emails. */
  number: number;
  /** Days Instantly waits before this step. */
  delay: number;
  subject: string;
  body: string;
  /** How many A/B variants the step has; the preview renders the first. */
  variants: number;
}

/**
 * The steps of one campaign, flattened.
 *
 * A FOLLOW-UP WITH NO SUBJECT IS NOT A BUG — it is a reply on the same thread,
 * which is how every sequence after step one is normally written. The preview
 * says "same thread" rather than showing an empty subject line, because an empty
 * subject is exactly what a missing variable also looks like.
 */
export async function getCampaignSteps(campaignId: string): Promise<SequenceStep[]> {
  const c = await call<RawCampaign>(`/campaigns/${encodeURIComponent(campaignId)}`);
  const steps = (c.sequences ?? []).flatMap((s) => s.steps ?? []);
  return steps.map((s, i) => {
    const v = (s.variants ?? [])[0] ?? {};
    return {
      number: i + 1,
      delay: typeof (s as { delay?: number }).delay === "number" ? (s as { delay: number }).delay : 0,
      subject: v.subject ?? "",
      body: v.body ?? "",
      variants: (s.variants ?? []).length,
    };
  });
}

export interface KnownLead {
  email: string;
  openCount: number;
  replyCount: number;
  /** ISO timestamp of when the lead was first added, i.e. when we last wrote. */
  createdAt: string;
}

/**
 * `failed` is not `found: false`. See `findLeads`.
 */
export interface LeadLookup {
  found: Map<string, KnownLead>;
  /** Addresses whose lookup threw. The caller must not render these as new. */
  failed: string[];
}

/**
 * HAVE WE ALREADY WRITTEN TO THIS ADDRESS?
 *
 * Asked of Instantly rather than of our own log, because Instantly is where the
 * sending actually happened. A local record can drift — a campaign deleted there,
 * a push that half-failed here — and the failure mode of a drifted record is
 * emailing a church twice, which is the thing this check exists to prevent.
 *
 * `reply_count` rides along because it is the trigger for Jason's second round:
 * a church contacted 60 days ago with no reply is a candidate to write to again
 * at a DIFFERENT address, and one that replied is not a candidate at all.
 */
export async function findLeads(emails: readonly string[]): Promise<LeadLookup> {
  const found = new Map<string, KnownLead>();
  const failed: string[] = [];

  /**
   * Serial, not `Promise.all`. Twenty churches a day is twenty requests; there is
   * nothing to gain from parallelism and a burst against a third-party rate limit
   * would fail the whole preview rather than a single row of it.
   */
  for (const email of emails) {
    const key = email.toLowerCase();
    try {
      const body = await call<{ items?: Array<Record<string, unknown>> }>("/leads/list", {
        method: "POST",
        body: JSON.stringify({ search: email, limit: 5 }),
      });
      const hit = (body.items ?? []).find((l) => String(l.email ?? "").toLowerCase() === key);
      if (hit) {
        found.set(key, {
          email,
          openCount: Number(hit.email_open_count ?? 0),
          replyCount: Number(hit.email_reply_count ?? 0),
          createdAt: String(hit.timestamp_created ?? ""),
        });
      }
    } catch {
      /**
       * A LOOKUP THAT FAILED IS NOT "NEVER CONTACTED", and the difference matters:
       * absent from `found` is what the caller renders as a clean new lead. So a
       * throw goes in `failed` and the preview says so out loud, rather than
       * quietly presenting an unknown as a safe send.
       */
      failed.push(email);
    }
  }
  return { found, failed };
}

export interface NewLead {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  personalization?: string;
  custom_variables?: Record<string, string | number | boolean | null>;
}

/**
 * Add one lead to a campaign.
 *
 * ONE CALL PER LEAD, and the route loops. Unlike demo export — where each church
 * costs a logo copy and a blob write, so the browser drives the loop to show
 * `x / y` — a lead is one fast request, and twenty of them finish inside a single
 * response. What matters is not progress but WHICH ones failed, so the route
 * returns a per-church result instead of a count.
 *
 * `skip_if_in_campaign` is the server-side half of the duplicate guard. The UI
 * warns before the push and this refuses during it, because the warning can be
 * read and dismissed by a person and this cannot.
 */
export async function addLead(campaignId: string, lead: NewLead): Promise<{ id: string }> {
  return call<{ id: string }>("/leads", {
    method: "POST",
    body: JSON.stringify({
      campaign: campaignId,
      skip_if_in_campaign: true,
      skip_if_in_workspace: false,
      ...lead,
    }),
  });
}
