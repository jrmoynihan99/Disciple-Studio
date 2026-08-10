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
  /**
   * THE ADDRESS A REVIEWER CHOSE, and the only thing here that outranks the
   * ranking.
   *
   * `exportContacts` decides who ships and in what order, and until now that
   * order was the whole answer to "who gets the email" — correct on average and
   * unarguable with, which is the problem: a reviewer looking at three addresses
   * usually knows which is the person to write to, and had no way to say so.
   * `demo-export.ts` writes their answer here, resolved through the same
   * function the review card renders from, so the address on the card and the
   * address in the campaign are one value rather than two agreeing derivations.
   *
   * Absent on every group row written before this existed, which is exactly the
   * case the fallback below covers.
   */
  send_to?: string;
  /**
   * THE NAME A REVIEWER TYPED FOR THIS CHURCH — the demo's greeting, and now the
   * email's.
   *
   * Absent or `""` means nobody typed one and the ranking's own derivation
   * stands. It is never the derived name and never the demo's stock fallback:
   * `ResolvedCard.greeting` carries the override alone, which is what makes it
   * safe to open an email with. See `contactsOf`.
   */
  greeting_first_name?: string;
}

/**
 * A NAME SOMEBODY TYPED, made safe to put in an email.
 *
 * It is going into a merge tag that lands in HTML somebody else's engine
 * renders, so the two things that cannot survive are angle brackets and line
 * breaks. Length is capped because this is an opener — a paragraph pasted into
 * the greeting field is a mistake, and a truncated one is more obvious than a
 * mailshot that opens with an essay.
 */
export function cleanGreeting(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[<>\r\n\t]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
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

/**
 * EXPORTED, because the review card has to offer the same addresses this will
 * accept. A "send here" control on `noreply@` is a choice the reviewer can make
 * and the push will then silently overrule — so both sides ask this one
 * function, rather than the card guessing at what a deliverable address is.
 */
export function usableInbox(email: unknown): email is string {
  return (
    typeof email === "string" &&
    email.includes("@") &&
    !NOT_A_HUMAN_INBOX.test(email.trim().split("@")[0] ?? "")
  );
}

const usable = usableInbox;

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
 * A TEST ADDRESS THAT REACHES YOU BUT LOOKS LIKE A DIFFERENT PERSON.
 *
 * Pushing fifteen churches at one inbox does not produce fifteen test emails —
 * it produces ONE. `addLead` sets `skip_if_in_campaign` and Instantly dedupes by
 * address, so fourteen churches would be silently skipped and the run would look
 * like it worked. Plus-addressing gives every church a distinct address that
 * Gmail and Microsoft both deliver to the same mailbox.
 *
 * The tag is the church's slug, so the inbox sorts by church and it is obvious
 * which email belongs to which demo.
 *
 * RETURNS NULL RATHER THAN GUESSING. The caller must refuse to push on null and
 * must never fall back to the real recipient — "send this to me" quietly
 * becoming "send this to fifteen congregations" is the worst outcome this
 * codebase can produce.
 */
export function testAddress(base: string, tag: string): string | null {
  const trimmed = base.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0 || at !== trimmed.lastIndexOf("@") || at === trimmed.length - 1) return null;
  if (/\s/.test(trimmed)) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return null;
  // A local part that already carries a +tag keeps only what precedes it, so
  // repeated tests do not build `jason+a+b+c@`.
  const stem = local.split("+")[0];
  if (!stem) return null;
  // Lowercased with the rest of the address: a local part is case-insensitive in
  // practice, and two tags differing only in case would read as two churches.
  const safeTag =
    tag.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "test";
  return `${stem}+${safeTag}@${domain}`;
}

/**
 * THE OPENER, CHANGED ON THE LAST SCREEN — one rule, two callers.
 *
 * The push screen lets a greeting be typed per church at the moment of sending,
 * and the two things that have to agree about it are the PREVIEW the browser
 * renders and the LEAD the server pushes. Patching the same variable map in two
 * places is how a preview starts showing something other than what goes out,
 * which is the one thing that screen must never do — the route's own comment
 * says so about the planner, and this is that rule one level down.
 *
 * WHAT IT WRITES, AND WHY EACH ONE:
 *  · `first_name`/`firstName` — the two spellings the merge namespace carries.
 *  · `greeting` — never empty, by design: it falls back to "there" so a template
 *    written as `Hi {{greeting}},` reads on every send. An empty `{{first_name}}`
 *    is `Hi ,` arriving at a congregation.
 *  · `last_name`/`lastName` — CLEARED. A name typed here is a first name; the
 *    surname on the row belongs to whoever the pipeline found, and gluing the
 *    two together invents a person and then writes to them.
 *
 * An empty `name` is a real answer meaning "no name, use the generic opener" —
 * not "leave it as it was". What the screen shows is what sends.
 */
export function withGreeting(
  vars: Readonly<Record<string, string>>,
  name: string,
): Record<string, string> {
  const first = cleanGreeting(name);
  return {
    ...vars,
    first_name: first,
    firstName: first,
    greeting: first || "there",
    last_name: "",
    lastName: "",
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

  /**
   * THE REVIEWER'S NAME BEATS EVERY DERIVATION BELOW, INCLUDING THE REFUSALS.
   *
   * Not just the "we found no name" case: it also overrides the shared-inbox
   * rule, which deliberately forfeits a first name because we cannot tell which
   * of three people reads `jennifer@`. That refusal is right when the answer is
   * derived from a list; it is not right over somebody who looked at the church
   * and typed a name.
   *
   * THE SURNAME IS DROPPED UNLESS IT STILL BELONGS TO THAT NAME. Overriding
   * "Pastor Mike Ruiz" to "Tom" and keeping "Ruiz" would build a person who does
   * not exist and mail them — so the last name survives only when the override
   * IS the derived given name (the common case: fixing a title or a casing).
   */
  const chosenName = cleanGreeting(c.greeting_first_name);
  const named = (r: Recipient): Recipient =>
    chosenName
      ? {
          ...r,
          firstName: chosenName,
          lastName: chosenName.toLowerCase() === r.firstName.toLowerCase() ? r.lastName : "",
          why: `greeting you set in review${r.title ? ` — ${r.title}` : ""}`,
        }
      : r;

  /**
   * THE REVIEWER'S CHOICE, FIRST AND WITHOUT A TIEBREAK.
   *
   * It comes before the ranking because it IS the ranking, made by the person
   * who read the card — and it is the only branch that can name a church office
   * address over a named person, which no derivation here would ever do. The
   * name still comes from a person carrying that address when one does, so
   * choosing the office inbox of a church whose secretary is listed at it still
   * opens with her name.
   *
   * A `send_to` that is not deliverable falls THROUGH rather than returning
   * null: it means the address was struck out or fixed after it was chosen, and
   * refusing to write to a church because of a stale pointer would be the
   * pointer deciding something nobody asked it to.
   */
  if (usable(c.send_to)) {
    const email = norm(c.send_to);
    const match = people.find((p) => usable(p?.email) && norm(p.email as string) === email);
    const shared = ambiguous(people, email);
    const { first, last } = match && !shared ? splitName(match.name ?? "") : { first: "", last: "" };
    return named({
      email,
      firstName: first,
      lastName: last,
      title: (match?.title ?? "").trim(),
      source: match ? "person" : "church_email",
      why: shared
        ? "chosen by you — shared inbox, so no first name"
        : `chosen by you${match?.title ? ` — ${match.title}` : ""}`,
    });
  }

  const candidates = people
    .filter((p) => usable(p?.email))
    .slice()
    .sort((a, b) => rankOf(a?.rank) - rankOf(b?.rank));

  const best = candidates[0];
  if (best) {
    const email = norm(best.email as string);
    const shared = ambiguous(people, email);
    const { first, last } = shared ? { first: "", last: "" } : splitName(best.name ?? "");
    return named({
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
    });
  }

  const office = churchEmails.map(norm).find(usable);
  if (office) {
    return named({
      email: office,
      firstName: "",
      lastName: "",
      title: "",
      source: "church_email",
      why: "no named contact — church office address",
    });
  }

  return null;
}
