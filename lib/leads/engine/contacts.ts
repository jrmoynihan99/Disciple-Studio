/**
 * WHICH CONTACTS SHIP, AND IN WHAT ORDER.
 *
 * The exported package carries AT MOST FOUR contacts per church. The review
 * sheet therefore has to show exactly those four — not more, not different ones,
 * not in a different order. Any drift between the two and a reviewer either
 * approves a contact that never ships, or never reads the one that does; both
 * end with somebody being written to on the strength of a line nobody checked.
 *
 * So the rule lives HERE, in the engine, and both the review card and the
 * exporter call it. It is deliberately not in the component — a rule that
 * renders is a rule that can be forgotten at the point it actually matters.
 *
 * ONE CHANNEL, NOT A PILE. Given an email address, a phone number and four
 * social profiles, the fourth-best way to reach a church is noise: it lengthens
 * the card, pushes the good address off the top, and invites somebody to DM a
 * congregation on Instagram when its office address was right there. The tiers
 * are ordered by how likely they are to reach a person who can answer.
 */

import type { ContactKind, ResolvedContact } from "./group-types.ts";
// The one test for "is this an address a person will read", shared with the rule
// that actually addresses the email. See `usableInbox`.
import { usableInbox } from "./outreach.ts";

/** How many the export carries. Everything here follows from this number. */
export const CONTACT_LIMIT = 4;

export type ContactTier = "email" | "phone" | "social";

/**
 * A PERSON IS NOT A CHANNEL.
 *
 * `contactsOf` emits a `person` when the pipeline recommended somebody, and it
 * does so even when it never found their address — a name and a role
 * ("Sarah Vance, Connections Pastor") is the single most useful thing on this
 * card, and it is what turns a cold call warm even if you end up ringing the
 * office number to ask for them.
 *
 * So people ride in the email tier rather than being filtered out for lacking an
 * address. The tiering is about which CHANNEL to offer, and a person is not one.
 */
export function contactTier(c: { kind: ContactKind; email: string }): ContactTier {
  if (c.kind === "phone") return "phone";
  if (c.kind === "social") return "social";
  return "email";
}

/** Is there a real address here, as opposed to a person we could not reach? */
function reachableByEmail(c: ResolvedContact): boolean {
  return !!c.email.trim();
}

export interface RankedContact {
  contact: ResolvedContact;
  /**
   * 1-based over the contacts that SHIP, or null for one that does not.
   *
   * If the pipeline's 2nd, 4th, 5th and 6th are what remain, they display as
   * 1, 2, 3, 4 — a reviewer counting "who is first" should never have to reason
   * about the ones that were dropped.
   *
   * `null` means "still on the card, not in the export". Today that is only a
   * struck-out contact; see below for why it is still here at all.
   */
  rank: number | null;
}

/**
 * The contacts a card shows, in the order it shows them.
 *
 * Input order is meaningful and is preserved: `contactsOf` emits recommended
 * people, then the communications lead, then church addresses, then the phone,
 * then socials — that sequence IS the priority, and re-sorting here would throw
 * away the pipeline's judgement about who is worth talking to.
 */
export function exportContacts(
  contacts: readonly ResolvedContact[],
  /**
   * The contact a reviewer addressed the email to — `ResolvedCard.sendTo`.
   *
   * IT IS APPLIED HERE RATHER THAN READ SEPARATELY DOWNSTREAM, because "who gets
   * the email" and "who ships, in what order" were never two questions. Rank 1
   * has always been the address that gets written to; a choice that did not move
   * the ranking would leave the card printing 1 beside one person and the
   * campaign writing to another.
   *
   * Ignored unless it names a contact that would ship AND carries an address
   * somebody reads — a pointer at a struck-out contact, or at a phone number, is
   * stale rather than an instruction, and the ranking simply stands.
   */
  sendTo = "",
): RankedContact[] {
  // A struck-out contact is a reviewer saying "not this one". It cannot ship,
  // so it must not be counted toward the four either — otherwise striking one
  // out silently shortens the list rather than promoting the next candidate.
  const live = contacts.filter((c) => !c.suppressed);

  const tier: ContactTier = live.some(reachableByEmail)
    ? "email"
    : live.some((c) => c.kind === "phone")
      ? "phone"
      : "social";

  /**
   * PEOPLE ARE NOT FILTERED BY THE CHANNEL RULE — they are not a channel.
   *
   * This is the case the rule gets wrong if you write it as one predicate: a
   * church with a named Connections Pastor whose address we never found, plus an
   * office phone. Tiering on channels alone drops to `phone`, and a naive filter
   * then discards the person for not being a phone number — deleting the most
   * useful line on the card in order to tidy up the second-most useful one.
   *
   * The exclusivity is between WAYS TO MAKE CONTACT. Who to ask for is a
   * different axis and always survives.
   */
  const inTier = (c: ResolvedContact) => c.kind === "person" || contactTier(c) === tier;

  /**
   * SUPPRESSION IS NOT DELETION, and this is where that nearly broke.
   *
   * Filtering suppressed contacts out of the RETURNED list removed them from the
   * DOM — so striking one out made it vanish, which is indistinguishable from a
   * hard delete and left nothing to press "put back" on. `/leads/audit` catches
   * exactly this ("a struck-out item stays visible, struck, and revertible") and
   * did.
   *
   * The two questions are different and both have to be answered:
   *   · does it SHIP?    no — it is excluded above, and takes no rank
   *   · does it RENDER?  yes — struck through, with its revert control
   *
   * A contact dropped by the CHANNEL rule never renders: nobody chose it, so
   * there is nothing to undo. A contact dropped by a PERSON does, because they
   * might have been wrong.
   */
  /**
   * THE CHOSEN CONTACT GOES FIRST, AND IS NEVER CUT.
   *
   * Hoisting before the limit is applied rather than after is the whole of it: a
   * church can list six people, and the one a reviewer picked may be the fifth.
   * Ranked in place it would fall outside the four that ship and the choice
   * would silently do nothing.
   */
  const eligible = live.filter(inTier);
  const chosen = sendTo
    ? eligible.find((c) => c.id === sendTo && usableInbox(c.email))
    : undefined;
  const ordered = chosen ? [chosen, ...eligible.filter((c) => c.id !== chosen.id)] : eligible;
  const rankById = new Map<string, number>();
  ordered.slice(0, CONTACT_LIMIT).forEach((c, i) => rankById.set(c.id, i + 1));

  /**
   * SUPPRESSION IS NOT DELETION, and this is where that nearly broke.
   *
   * Filtering suppressed contacts out of the RETURNED list removed them from the
   * DOM — so striking one out made it vanish, which is indistinguishable from a
   * hard delete and left nothing to press "put back" on. `/leads/audit` catches
   * exactly this ("a struck-out item stays visible, struck, and revertible")
   * and did.
   *
   * The two questions are different and both have to be answered:
   *   · does it SHIP?    no — it takes no rank
   *   · does it RENDER?  yes — struck through, with its revert control
   *
   * A contact dropped by the CHANNEL rule never renders: nobody chose it, so
   * there is nothing to undo. A contact dropped by a PERSON does, because they
   * might have been wrong.
   */
  const out: RankedContact[] = [];
  if (chosen) out.push({ contact: chosen, rank: 1 });
  for (const contact of contacts) {
    if (chosen && contact.id === chosen.id) continue;
    /**
     * A SUPPRESSED CONTACT ALWAYS RENDERS, WHATEVER THE TIER SAYS.
     *
     * Gating it on the tier is wrong, and wrong in the exact case that matters:
     * strike out a church's only email address and the tier legitimately falls
     * to `phone` — at which point the struck email is no longer "in tier" and
     * disappears, taking its own undo control with it. The reviewer is left
     * unable to reverse the thing they just did.
     *
     * The tier answers "which channel do we send on". Suppression answers "did a
     * human reject this". Only the first is a filter.
     */
    if (contact.suppressed) {
      out.push({ contact, rank: null });
      continue;
    }
    const rank = rankById.get(contact.id);
    if (rank != null) out.push({ contact, rank });
  }
  return out;
}

/**
 * WHICH OF THESE ACTUALLY RECEIVES THE EMAIL.
 *
 * The card says it out loud and `demo-export.ts` writes it into the group row as
 * `send_to`, so the address a reviewer read is the address Instantly is handed —
 * one value, resolved once, rather than two derivations that agree until one of
 * them is edited.
 *
 * It is the first RANKED contact with an address a person will read, which is
 * the rule `pickRecipient` already applied in a different vocabulary. Phone and
 * social rows carry no address and are skipped; so is `noreply@`, because
 * offering it would be offering a guaranteed bounce.
 */
export function recipientOf(ranked: readonly RankedContact[]): RankedContact | null {
  return ranked.find((r) => r.rank !== null && usableInbox(r.contact.email)) ?? null;
}
