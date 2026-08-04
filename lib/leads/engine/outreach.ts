/**
 * WHO A BATCH'S EMAIL ACTUALLY GOES TO, and what it may call them.
 *
 * The one rule deciding the address on a cold email and the word it opens with.
 * Both are things a congregation reads, so both are decided here rather than in
 * the route — same reason `person-name.ts` sits beside this file, and the same
 * constraint applies: NO IMPORTS THAT NEED A PATH ALIAS, because `node --test`
 * resolves none, and a rule that picks the recipient of every outbound email is
 * not one to leave untested.
 *
 * IT READS THE DEMO GROUP, NOT THE CORPUS. `exportContacts` already decided which
 * contacts ship and in what order, with every reviewer edit and strike-out folded
 * in, and `demo-export.ts` wrote that decision into the group as
 * `contacts.people[].rank`. Re-deriving a ranking from the raw record here would
 * mean the email could go to somebody the reviewer struck out — the exact drift
 * `exportContacts` exists to prevent.
 */

import { givenName, properCase } from "./person-name.ts";

/** The `contacts` object `demo-export.ts` writes onto every `GroupRow`. */
export interface DemoContacts {
  people?: ReadonlyArray<{
    name?: string;
    rank?: number;
    email?: string;
    title?: string;
  }>;
  church_emails?: readonly string[];
  phone?: string;
}

export type RecipientSource = "person" | "church_email";

export interface Recipient {
  email: string;
  /**
   * The word the email opens with, or `""` when the inbox cannot be pinned to one
   * person. `""` is a real answer and the CALLER must have a greeting that reads
   * without a name — see `ambiguous` below. It is not a defect to be defaulted.
   */
  firstName: string;
  /** Everything after the given name, for `{{last_name}}`. Often empty. */
  lastName: string;
  title: string;
  source: RecipientSource;
  /** Why this address won, in words. The dry run prints it. */
  why: string;
}

/**
 * Addresses that are not a person and cannot start a conversation.
 *
 * A REJECTION, NOT A DEPRIORITISATION. Sending a sequence to `noreply@` is not a
 * weaker send, it is a guaranteed non-delivery that still spends a slot in the
 * daily volume and still counts against the sending domain when it bounces.
 *
 * Matched on the local part only. `postmaster` and `abuse` are RFC-mandated
 * role accounts read by infrastructure people, never by a pastor; `donations`
 * and `giving` are transactional inboxes wired to a payment processor.
 */
const NOT_A_HUMAN_INBOX =
  /^(no-?reply|do-?not-?reply|donotreply|postmaster|mailer-daemon|bounce[sd]?|abuse|webmaster|noc|hostmaster)([+.-]|$)/i;

const usable = (email: unknown): email is string =>
  typeof email === "string" &&
  email.includes("@") &&
  !NOT_A_HUMAN_INBOX.test(email.trim().split("@")[0] ?? "");

const norm = (email: string) => email.trim().toLowerCase();

/**
 * RANK IS AN ORDER, AND A MISSING RANK IS NOT RANK 0.
 *
 * `exportContacts` numbers from zero and hands `null` to a struck-out contact,
 * which `demo-export.ts` then filters out — so anything arriving here without a
 * number came from somewhere that did not rank at all. Treating that as the best
 * candidate would let an unranked contact outrank the lead pastor.
 */
const rankOf = (r?: number) => (typeof r === "number" && Number.isFinite(r) ? r : Number.MAX_SAFE_INTEGER);

/**
 * DOES THIS ADDRESS BELONG TO EXACTLY ONE PERSON?
 *
 * Measured against the corpus this is not hypothetical. Living Word Church lists
 * five recommended contacts, and three of them — Joel Murray, Pat Murray and
 * Jackie Murray — all carry `jennifer@dlwc.org`. That inbox is Jennifer's. An
 * email to it opening "Hi Joel" is wrong in a way the reader notices instantly,
 * and the whole point of this pipeline is a message that reads as though a person
 * wrote it.
 *
 * So a shared address still gets used — it is a real, reachable inbox — but it
 * forfeits the first name. Names are compared case-insensitively and only when
 * present, because two blank names are not two different people.
 */
function ambiguous(people: NonNullable<DemoContacts["people"]>, email: string): boolean {
  const names = new Set(
    people
      .filter((p) => usable(p?.email) && norm(p.email as string) === email)
      .map((p) => (p?.name ?? "").trim().toLowerCase())
      .filter(Boolean),
  );
  return names.size > 1;
}

/** `"Rev. Dr. Karen Webb"` -> `["Karen", "Webb"]`, honorifics dropped. */
function splitName(full: string): { first: string; last: string } {
  const first = givenName(full);
  if (!first) return { first: "", last: "" };
  const tokens = full.trim().split(/\s+/);
  const at = tokens.findIndex((t) => t === first);
  return {
    first: properCase(first),
    last: at >= 0 ? tokens.slice(at + 1).join(" ") : "",
  };
}

/**
 * The address this church's email goes to, or `null` when there is none.
 *
 * ORDER: a named person the reviewer approved, then the church's own office
 * address. A named inbox is worth more than a generic one because it can be
 * greeted, and being greeted by name is most of what separates this from a
 * mailshot — but a generic address that reaches somebody beats a personal one
 * that does not exist, which is why `church_emails` is a fallback and not a
 * filter.
 *
 * `null` means the church is unreachable by email. 1,776 of 15,273 are. The
 * caller must report them rather than silently shipping 18 leads for a batch of
 * twenty.
 */
export function pickRecipient(contacts: unknown): Recipient | null {
  const c = (contacts ?? {}) as DemoContacts;
  const people = Array.isArray(c.people) ? c.people : [];
  const churchEmails = Array.isArray(c.church_emails) ? c.church_emails : [];

  const candidates = people
    .filter((p) => usable(p?.email))
    .slice()
    .sort((a, b) => rankOf(a?.rank) - rankOf(b?.rank));

  const best = candidates[0];
  if (best) {
    const email = norm(best.email as string);
    const shared = ambiguous(people, email);
    const { first, last } = shared ? { first: "", last: "" } : splitName(best.name ?? "");
    return {
      email,
      firstName: first,
      lastName: last,
      title: (best.title ?? "").trim(),
      source: "person",
      why: shared
        ? `shared inbox — ${people.filter((p) => usable(p?.email) && norm(p.email as string) === email).length} people list this address, so no first name`
        : first
          ? `rank ${rankOf(best.rank)} contact${best.title ? ` — ${best.title}` : ""}`
          : `rank ${rankOf(best.rank)} contact, no usable given name`,
    };
  }

  const office = churchEmails.map(norm).find(usable);
  if (office) {
    return {
      email: office,
      firstName: "",
      lastName: "",
      title: "",
      source: "church_email",
      why: "no named contact — church office address",
    };
  }

  return null;
}
