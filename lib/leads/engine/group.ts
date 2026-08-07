/**
 * The edit algebra for an export group.
 *
 * Pure, and deliberately so: the same functions run optimistically in the
 * browser and authoritatively on the server when it folds a PATCH into the blob.
 * Two implementations of "what does this edit mean" would diverge, and the one
 * that diverged would be the one nobody was looking at.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: an edited value is no longer the
 * church's words. `resolve()` is where a stored edit becomes an `Attribution`,
 * and the `edited` and `user` variants have no `sourceUrl` field to render — so
 * a component cannot cite a page for a sentence a person typed, even by mistake.
 */

import type {
  AddedContact,
  AddedItem,
  AddedPathwayStep,
  AddedStep,
  EntryEdits,
  ExportGroup,
  GroupEntry,
  GroupOp,
  GroupStatus,
  LogoCrop,
  ResolvedCard,
  ResolvedContact,
  ResolvedPathwayStep,
  ResolvedSlogan,
  ResolvedStep,
  Membership,
  MembershipRef,
  SnapshotContact,
  SnapshotLogo,
  SnapshotStep,
  Voice,
} from "./group-types.ts";
import {
  LOGO_ITEM_ID,
  PATH,
  isSafeGroupId,
  pathPrefixFor,
  pathwayIsOrdered,
} from "./group-types.ts";
// ONE mapping of "why is there no logo" for every surface — the console's list
// tile reads the same function, so the two cannot word it differently.
import { logoAbsence } from "./logo.ts";

const MAX_FIELD_LEN = 4000;
const ADDED_ID = /^u_[a-z0-9]{4,32}$/;

/* ------------------------------------------------------------------ *
 * Resolve — snapshot + edits -> what the card renders
 * ------------------------------------------------------------------ */

/** A pipeline string that has not been touched, with whatever citation it has. */
function sourceVoice(text: string, sourceUrl: string, verified: string, note: string): Voice {
  return {
    text,
    attribution: sourceUrl
      ? { kind: "cited", sourceUrl, verified }
      : { kind: "uncited", note },
  };
}

function editedVoice(value: string, base: string): Voice {
  return { text: value, attribution: { kind: "edited", wasVerbatim: base } };
}

function userVoice(text: string): Voice {
  return { text, attribution: { kind: "user" } };
}

/**
 * The value for a path, and whether a person put it there.
 *
 * The edit's presence is the whole signal — which is why reverting deletes the
 * key rather than writing back the original. An edit recorded as `""` and an
 * absent edit look identical to a naive reader, and the slogan's three states
 * die the moment those two are confused.
 */
function edit(entry: GroupEntry, path: string): { value: string; base: string } | null {
  const e = entry.edits.fields[path];
  return e ? { value: e.value, base: e.base } : null;
}

function isSuppressed(entry: GroupEntry, id: string): boolean {
  return entry.edits.suppressed[id] != null;
}

function resolveName(entry: GroupEntry): Voice {
  const s = entry.snapshot;
  const e = edit(entry, PATH.name);
  if (e) return editedVoice(e.value, e.base);
  const repair = s.nameRepair;
  // A repaired name is a cited claim — 34 of 134 were rebuilt from a quoted
  // og:title — so the card can show its working. An unrepaired name is just the
  // name; there is nothing to cite and nothing to doubt.
  return repair && repair.sourceUrl
    ? { text: s.name, attribution: { kind: "cited", sourceUrl: repair.sourceUrl, verified: repair.verified } }
    : { text: s.name, attribution: { kind: "uncited", note: "as published" } };
}

/**
 * THE SLOGAN IS THE REVIEWER'S TO WRITE, AND ONLY THEIRS.
 *
 * The card used to open with whatever `brand.slogan` held — a string lifted off
 * a `<title>` tag, which is where a church puts "Home | First Baptist Church of
 * Springfield | Springfield, IL" rather than what it would say about itself. It
 * reads as a slogan often enough to be waved through, and it HEADLINES the demo
 * the church receives. Owner's call: do not offer it, ask for one.
 *
 * SO THE PIPELINE'S TEXT IS NOT RENDERED AND IS NOT SENT — an unedited card
 * resolves to `none`, which is the state the review sheet draws as work to do
 * and `toRawChurch` ships as no tagline at all. The snapshot still CARRIES it,
 * scope and all (`snapshot.ts` and its tests are untouched), so this is a
 * decision about what we present rather than a discarded measurement: the day
 * somebody wants a "use the one we found" control, the string is still there.
 *
 * WHAT IT COSTS, stated plainly: a batch exported BEFORE this change shows a
 * blank slogan on its record page, though its demos shipped the extracted one.
 * The demos themselves are untouched — they are built and live at `/c/<slug>`.
 *
 * The three states survive where they are still true. `homepage_only` versus
 * `none` was always a fact about our crawl rather than about the church, it is
 * still on the snapshot, and both of them were already drawn identically here.
 */
function resolveSlogan(entry: GroupEntry): ResolvedSlogan {
  const e = edit(entry, PATH.slogan);
  // `userVoice`, not `editedVoice`: with the pipeline's text out of the way
  // there is nothing this could be an edit OF, and "edited — no longer the
  // church's words" over a revert to blank would be a claim about nothing.
  return e?.value ? { kind: "slogan", voice: userVoice(e.value) } : { kind: "none" };
}

/**
 * The order a reviewer dragged a list into, applied.
 *
 * STABLE, AND MISSING IDS GO LAST. `Array.prototype.sort` is required to be
 * stable, so items the stored order does not name keep their relative order
 * among themselves and land after the ones it does. That is what makes a step
 * added after a reorder append rather than jump to the front, and it is why an
 * order that has gone stale — ids that no longer exist, or a list that grew —
 * degrades to "mostly what you asked for" instead of throwing anything away.
 */
function inStoredOrder<T extends { id: string }>(items: T[], order: string[] | undefined): T[] {
  if (!order?.length) return items;
  const at = new Map(order.map((id, i) => [id, i]));
  return items
    .slice()
    .sort((a, b) => (at.get(a.id) ?? Infinity) - (at.get(b.id) ?? Infinity));
}

/**
 * A step has ONE Title, and this returns it.
 *
 * ON A v2 SNAPSHOT THIS DOES NOTHING, BY CONSTRUCTION. `stepsOf` reads
 * `next_steps[].final_name`, where the pipeline has already graded the church's
 * own word against the category and either kept it or swapped ours in, and it
 * writes `ownTerms: []`. So the first branch fires and the title is returned
 * unchanged. Re-deriving the choice here would be a second, drifting copy of a
 * judgement made against evidence this layer does not have.
 *
 * IT STILL MATTERS FOR EVERY BATCH FROZEN BEFORE v2. Those snapshots were built
 * one-step-per-category and stored both candidates, because back then nothing
 * upstream had chosen between them:
 *
 *   no own term                    → our category   ("Small groups")
 *   own term, no confidence field  → their wording  — no opinion is not a veto
 *   own term, confidence trusted   → their wording  ("Life Groups")
 *   own term, confidence not       → our category   — a button label or a fragment
 *
 * A snapshot is frozen at collect time, so those batches keep resolving by the
 * rule that was correct when they were taken. That is the whole point of freezing
 * one, and it is why this function is kept rather than deleted.
 */
const TRUSTED_TITLE_CONFIDENCE = new Set(["high", "medium"]);

function stepTitle(s: SnapshotStep): { text: string; note: string } {
  const own = s.ownTerms[0]?.trim() ?? "";
  if (!own) return { text: s.label, note: "our category" };

  const confidence = (s.titleConfidence ?? "").trim().toLowerCase();
  if (confidence && !TRUSTED_TITLE_CONFIDENCE.has(confidence)) {
    return { text: s.label, note: "our category" };
  }
  return { text: own, note: "their wording" };
}

function resolveSteps(entry: GroupEntry): ResolvedStep[] {
  const out: ResolvedStep[] = entry.snapshot.steps.map((s) => {
    const labelEdit = edit(entry, PATH.step(s.id, "label"));
    const quoteEdit = edit(entry, PATH.step(s.id, "quote"));
    const title = stepTitle(s);
    return {
      id: s.id,
      provenance: "source",
      suppressed: isSuppressed(entry, s.id),
      key: s.key,
      state: s.state,
      /**
       * `generated` IS TESTED BEFORE THE EDIT, and the order is the whole point.
       *
       * It was the other way round, so one keystroke on a fabricated step's
       * title produced `{kind:"edited", wasVerbatim:"Attend a Worship Service"}`
       * — and that string is OURS. The card then read "edited — no longer the
       * church's words" above a revert button titled `Original: Attend a Worship
       * Service`, asserting twice that the church had said it. 12,221 of 15,273
       * cards resolve at least one generated label, so this is not a corner.
       *
       * The same shape as the added-item branch below, for the same reason: what
       * a thing IS survives being edited. See `Attribution`.
       */
      label: s.generated
        ? labelEdit
          ? { text: labelEdit.value, attribution: { kind: "editedGenerated", wasGenerated: labelEdit.base } }
          : // WE INVENTED THIS ONE. `generated` renders, always, because the
            // alternative is a fabricated step sitting in a list of observed ones
            // looking exactly like them.
            { text: title.text, attribution: { kind: "generated" } }
        : labelEdit
          ? editedVoice(labelEdit.value, labelEdit.base)
          : // The note is not rendered — it records WHICH SOURCE WON, so the
            // choice is inspectable in a test and in a stored group rather than
            // being an invisible branch. See `stepTitle`.
            { text: title.text, attribution: { kind: "uncited", note: title.note } },
      quote: quoteEdit
        ? editedVoice(quoteEdit.value, quoteEdit.base)
        : s.quote
          ? sourceVoice(s.quote, s.sourceUrl, s.verified, "no page recorded")
          : null,
    };
  });

  for (const item of entry.edits.added) {
    if (item.kind !== "step") continue;
    const labelEdit = edit(entry, PATH.step(item.id, "label"));
    const quoteEdit = edit(entry, PATH.step(item.id, "quote"));
    const quote = quoteEdit ? quoteEdit.value : item.quote;
    out.push({
      id: item.id,
      provenance: "user",
      suppressed: false,
      key: "",
      state: null,
      // A hand-added item stays `user` however often it is edited. It was never
      // the church's words, so "edited" would be the wrong correction to make.
      label: userVoice(labelEdit ? labelEdit.value : item.label),
      quote: quote ? userVoice(quote) : null,
    });
  }

  return inStoredOrder(out, entry.edits.order?.steps);
}

function resolvePathwaySteps(entry: GroupEntry): { steps: ResolvedPathwayStep[]; numbered: boolean } {
  const p = entry.snapshot.pathway;
  const sourceNumbered = pathwayIsOrdered(p.orderBasis);
  const added = entry.edits.added.filter((i): i is AddedPathwayStep => i.kind === "pathwayStep");

  // Only an explicit basis licenses "Step 1 → Step 4"; `page_order` is DOM order
  // and says nothing about sequence. The exception is a list a person wrote
  // themselves — they chose the order, so the numbers are theirs to assert.
  const numbered = p.steps.length ? sourceNumbered : added.length > 0;

  const steps: ResolvedPathwayStep[] = p.steps.map((s) => {
    const labelEdit = edit(entry, PATH.pathwayStep(s.id, "label"));
    const quoteEdit = edit(entry, PATH.pathwayStep(s.id, "quote"));
    const blurbEdit = edit(entry, PATH.pathwayStep(s.id, "blurb"));
    return {
      id: s.id,
      provenance: "source",
      suppressed: isSuppressed(entry, s.id),
      ordinal: numbered ? s.ordinal : null,
      label: labelEdit
        ? editedVoice(labelEdit.value, labelEdit.base)
        : sourceVoice(s.label, s.sourceUrl, s.labelVerified, "no page recorded"),
      blurb: blurbEdit ? blurbEdit.value : s.blurb,
      quote: quoteEdit
        ? editedVoice(quoteEdit.value, quoteEdit.base)
        : s.quote
          ? sourceVoice(s.quote, s.sourceUrl, s.verified, "no page recorded")
          : null,
      /* `categoryRaw` — what the page called this step, where that differs from
         `label` — used to ride along here as a chip. A pathway step's `label` is
         ALREADY the church's own name for it ("Adult Inquirers Class"), so the
         chip was showing a second-order detail beside a first-order one. It went
         with the chips; the snapshot still holds it. */
    };
  });

  added.forEach((item, i) => {
    const labelEdit = edit(entry, PATH.pathwayStep(item.id, "label"));
    const blurbEdit = edit(entry, PATH.pathwayStep(item.id, "blurb"));
    /**
     * THE QUOTE EDIT IS READ HERE TOO, and it used to be hard-coded `null`.
     *
     * The card draws the same editable quote cell on a hand-added pathway step
     * as on a pipeline one, `sanitizeOp` accepts the op and the server writes it
     * to R2 — and then this branch discarded it, so the text vanished on the
     * next render while sitting in the stored batch forever. The source-step
     * branch above reads it correctly, and so does the added-NEXT-step branch in
     * `resolveSteps`; this was the one place out of three that did not.
     *
     * `userVoice`, never `editedVoice`: a person typed it, and there is no
     * earlier version of it that belonged to anybody else.
     */
    const quoteEdit = edit(entry, PATH.pathwayStep(item.id, "quote"));
    steps.push({
      id: item.id,
      provenance: "user",
      suppressed: false,
      ordinal: numbered ? p.steps.length + i + 1 : null,
      label: userVoice(labelEdit ? labelEdit.value : item.label),
      blurb: blurbEdit ? blurbEdit.value : item.blurb,
      quote: quoteEdit?.value ? userVoice(quoteEdit.value) : null,
    });
  });

  /**
   * A HAND-ORDERED PATHWAY IS NUMBERED BY WHERE THE STEPS WERE PUT.
   *
   * `ordinal` is the church's own numbering when they published one, and that is
   * exactly why it cannot survive a drag: leaving it would have the data say
   * "this is step 3" about a row a reviewer deliberately moved to the top. It is
   * renumbered ONLY when an order was stored — an untouched list keeps the
   * church's numbers, which is the whole reason the field exists.
   *
   * `numbered` is untouched either way. Whether the demo may CLAIM a sequence is
   * decided by `pathwayIsOrdered` from the page we read it off; choosing the
   * order a card reads in is not that claim, and must not be able to become it.
   */
  const order = entry.edits.order?.pathway;
  if (!order?.length) return { steps, numbered };
  return {
    steps: inStoredOrder(steps, order).map((s, i) => ({ ...s, ordinal: numbered ? i + 1 : null })),
    numbered,
  };
}

function resolveFinding(entry: GroupEntry): Voice | null {
  const f = entry.snapshot.pathway.finding;
  const e = edit(entry, PATH.finding("quote"));
  if (e) return editedVoice(e.value, e.base);
  if (!f) return null;
  return sourceVoice(f.quote, f.sourceUrl, f.verified, "no page recorded");
}

function resolveContacts(entry: GroupEntry): ResolvedContact[] {
  const field = (id: string, f: "name" | "title" | "email" | "value", fallback: string) => {
    const e = edit(entry, PATH.contact(id, f));
    return e ? e.value : fallback;
  };
  const touched = (id: string) =>
    (["name", "title", "email", "value"] as const).some(
      (f) => entry.edits.fields[PATH.contact(id, f)] != null,
    );

  const out: ResolvedContact[] = entry.snapshot.contacts.map((c: SnapshotContact) => ({
    id: c.id,
    provenance: "source",
    suppressed: isSuppressed(entry, c.id),
    kind: c.kind,
    name: field(c.id, "name", c.name),
    title: field(c.id, "title", c.title),
    roleLabel: c.roleLabel,
    email: field(c.id, "email", c.email),
    value: field(c.id, "value", c.value),
    network: c.network,
    edited: touched(c.id),
  }));

  for (const item of entry.edits.added) {
    if (item.kind !== "contact") continue;
    out.push({
      id: item.id,
      provenance: "user",
      suppressed: false,
      kind: "person",
      name: field(item.id, "name", item.name),
      title: field(item.id, "title", item.title),
      roleLabel: "",
      email: field(item.id, "email", item.email),
      value: "",
      network: "",
      edited: false,
    });
  }

  return out;
}

/** Snapshot + edits → everything a card renders. Pure, and the only merge. */
export function resolve(entry: GroupEntry): ResolvedCard {
  const s = entry.snapshot;
  const nameEdited = entry.edits.fields[PATH.name] != null;
  const { steps: pathwaySteps, numbered } = resolvePathwaySteps(entry);
  /**
   * WHICH IMAGE THIS CHURCH'S DEMO GETS, in one place.
   *
   * A reviewer may switch to one of the runner-ups (`logoPick`) and may strike
   * the logo out entirely (`suppressed`), in either order and repeatedly. The
   * two are independent: switching does not un-strike, and putting one back
   * restores whichever image was chosen rather than always ours.
   *
   * `logoRemoved` is only meaningful when there WAS one to remove — counting the
   * pick, since a church with no logo of ours can still have been given one from
   * the alternatives. A suppression left behind on a church whose logo later
   * vanished from the snapshot must not claim a person removed something that is
   * not there.
   */
  const chosen = entry.edits.logoPick ?? s.logo;
  const logoRemoved = !!chosen && entry.edits.suppressed[LOGO_ITEM_ID] != null;
  /**
   * A CROP BELONGS TO ONE PICTURE.
   *
   * `logo.pick` already drops it, so the sha test is the second lock rather than
   * the first — and it is the one that holds for a stored batch whose crop was
   * written before that rule existed, or whose snapshot logo changed underneath
   * it. A trimmed version of a mark this card is no longer shipping must never
   * be drawn over the mark it IS shipping.
   */
  const crop = entry.edits.logoCrop;
  const logoCrop = !logoRemoved && crop && chosen && crop.sha === chosen.sha ? crop : null;

  return {
    orgId: entry.orgId,
    stale: false,
    name: resolveName(entry),
    // The pre-repair name is shown as evidence for the repair. Once a person
    // renames the church themselves, the repair is no longer what produced what
    // you see, so its working stops being relevant.
    nameOriginal: !nameEdited && s.nameRepair ? s.nameOriginal : "",
    churchUrl: s.churchUrl,
    /**
     * A REMOVED LOGO RESOLVES TO NO LOGO, which is what makes this one line the
     * whole feature: every reader of `card.logo` — the card's plate, the flag
     * chips, and `toRawChurch`, which decides what the church's demo is built
     * with — already handles null, so none of them needed to learn a new rule.
     */
    logo: logoRemoved ? null : chosen,
    /**
     * WHY THERE IS NO LOGO OF OURS — cleared once the reviewer supplies one.
     *
     * Keeping it would let the card say "the page carried no image that could
     * have been a logo" beside a logo, which is a sentence about our pipeline
     * being read as a sentence about the church.
     */
    noLogo: entry.edits.logoPick ? null : s.noLogo,
    logoRemoved,
    /** THEIRS, NOT OURS — the reviewer overruled the pipeline's pick. */
    logoSwitched: !!entry.edits.logoPick,
    logoCrop,
    slogan: resolveSlogan(entry),
    stepsLooked: s.stepsLooked,
    steps: resolveSteps(entry),
    pathway: {
      /**
       * EDITABLE, because the review sheet renders it as one. `PATH.finding("label")`
       * already existed in the path table but nothing read it back, so an edit to
       * the pathway's name was stored and then silently ignored on the next
       * render — the field looked editable and was not.
       */
      name: edit(entry, PATH.finding("label"))?.value ?? s.pathway.name,
      numbered,
      finding: resolveFinding(entry),
      steps: pathwaySteps,
    },
    contacts: resolveContacts(entry),
    contactNote: s.contactNote,
    greeting: edit(entry, PATH.greeting)?.value.trim() ?? "",
    /**
     * WHO THE EMAIL IS ADDRESSED TO, carried raw.
     *
     * Not checked against the contacts here on purpose: whether the chosen one
     * still ships is a question about the export's own rules — the four-contact
     * limit, the channel tier, the strike-outs — and `exportContacts` is the
     * single place those are answered. A second opinion here is how the card
     * would come to show one recipient while the push used another.
     */
    sendTo: entry.edits.sendTo ?? "",
    accent: entry.edits.accent ?? "",
    // A switched logo is work somebody did, so it counts — which is also what
    // makes the console stop and ask before un-collecting the church. So is
    // every other choice that is not a typed string: a crop, a recipient, an
    // accent and a hand-ordered list are all things somebody would have to do
    // again if the church were un-collected.
    editedCount:
      Object.keys(entry.edits.fields).length +
      (entry.edits.logoPick ? 1 : 0) +
      (entry.edits.logoCrop ? 1 : 0) +
      (entry.edits.sendTo ? 1 : 0) +
      (entry.edits.accent ? 1 : 0) +
      (entry.edits.order?.steps?.length ? 1 : 0) +
      (entry.edits.order?.pathway?.length ? 1 : 0),
    suppressedCount: Object.keys(entry.edits.suppressed).length,
  };
}

/* ------------------------------------------------------------------ *
 * What would actually go out
 * ------------------------------------------------------------------ */

/**
 * The items an export may include.
 *
 * Nothing calls this yet — the export button is deliberately inert. It ships now
 * anyway, with tests, because the moment to write down "a struck-out item does
 * not go out" is while that rule is fresh. The alternative is that whoever wires
 * the export later reads `card.steps`, ships the suppressions, and sends a
 * church the very line someone deleted for being wrong.
 */
export function exportableItems(card: ResolvedCard): {
  steps: ResolvedStep[];
  pathwaySteps: ResolvedPathwayStep[];
  contacts: ResolvedContact[];
} {
  return {
    steps: card.steps.filter((s) => !s.suppressed),
    pathwaySteps: card.pathway.steps.filter((s) => !s.suppressed),
    contacts: card.contacts.filter((c) => !c.suppressed),
  };
}

/* ------------------------------------------------------------------ *
 * Flags
 * ------------------------------------------------------------------ */

/**
 * `unk` — we never looked. `unver` — we looked, and cannot stand behind it.
 * `plain` — a measured absence, which is a fact and not a verdict.
 */
export type CardFlagTone = "unk" | "unver" | "plain";

export interface CardFlag {
  key: string;
  label: string;
  tone: CardFlagTone;
  /** Why it is here. Every flag has to be able to answer that. */
  title: string;
}

/**
 * Where to look first on a card.
 *
 * A reviewer skimming twenty churches cannot read every line of every one, so
 * these point at the places a mistake is most likely. THEY NEVER SAY SOMETHING
 * IS WRONG — every one is either "we did not read this" or "we cannot cite
 * this", both of which are facts about our pipeline rather than claims about a
 * church.
 *
 * Two absences are deliberately NOT flagged, because flagging them would put a
 * badge on nearly every card and badges that are always on are invisible:
 *
 *  · an unedited slogan is `uncited` by construction ("from the site's title"),
 *  · so is an unedited step label ("our category").
 *
 * Only QUOTES are checked for citation, because a quote is the one thing on the
 * card that claims to be the church's own words.
 */
export function cardFlags(card: ResolvedCard): CardFlag[] {
  const out: CardFlag[] = [];

  /**
   * THE ONE FLAG THAT IS ON EVERY CARD UNTIL SOMEBODY DOES SOMETHING.
   *
   * Which breaks this file's own rule — a flag that never varies is furniture —
   * and it is deliberate, because the rule it breaks is about SIGNALS and this
   * is now a to-do. Slogans are no longer taken from the pipeline at all (see
   * `resolveSlogan`), so every card starts without one and this is the mark that
   * says which churches have been through. It goes out the moment a slogan is
   * typed, which is the difference between a checklist and furniture.
   *
   * It used to say "No slogan was extracted", and that would now be a lie: one
   * usually was, we are simply not offering it.
   */
  if (card.slogan.kind !== "slogan") {
    out.push({
      key: "slogan",
      label: "slogan needed",
      tone: "plain",
      title:
        "This demo has no slogan yet. We no longer fill one in from the church's page title — click the line under their name and write it.",
    });
  }

  if (!card.stepsLooked) {
    out.push({
      key: "steps",
      label: "next steps: not read",
      tone: "unk",
      title: "Next-step pages were never fetched for this church. This is not a list of what they lack.",
    });
  }

  const uncited = [...card.steps, ...card.pathway.steps].filter(
    (s) => !s.suppressed && s.quote?.attribution.kind === "uncited",
  ).length;
  if (uncited > 0) {
    out.push({
      key: "uncited",
      label: `${uncited} quote${uncited === 1 ? "" : "s"} with no page`,
      tone: "unver",
      title: "We hold these words but recorded no page they came from, so nobody can check them.",
    });
  }

  if (card.contacts.filter((c) => !c.suppressed).length === 0) {
    out.push({
      key: "contacts",
      label: "no contacts",
      tone: "plain",
      title: "No contact details survived. There is nobody to send this to.",
    });
  }

  /**
   * A REJECTED LOGO IS A JUDGEMENT SOMEBODY MADE, so it is stated rather than
   * left as an absence.
   *
   * Without it, a card whose logo was removed is indistinguishable at a glance
   * from one that never had a logo — the plate shows initials either way — and
   * the card collapses, so the `put back` control is not on screen to say
   * otherwise. This is the only flag on the card that reports something a
   * REVIEWER did rather than something the pipeline found, which is exactly why
   * it has to be visible: it is the one an owner might want to overturn.
   */
  if (card.logoRemoved) {
    out.push({
      key: "logo",
      label: "logo removed",
      tone: "plain",
      title: "You took this logo off the card, so the demo will be built without one. Expand the church to put it back.",
    });
  }

  /**
   * THE PIPELINE FOUND NO LOGO, AND WHY — the flag this file's own comment
   * promised and never delivered.
   *
   * `SnapshotNoLogo.reason` exists solely to keep "we found nothing" apart from
   * "we found one and rejected it", `buildSnapshot` populates it and `resolve`
   * carries it — and no component read it. The note beside the logo plate said
   * the distinction "rides on the flag chips instead"; there was no logo chip.
   * So the one fact the type was created to preserve was reachable only by
   * reading the stored blob.
   *
   * `logoAbsence` is the same mapping the console's list tile uses, so the two
   * surfaces cannot describe one church's missing logo differently.
   */
  if (!card.logoRemoved && !card.logo) {
    const absence = logoAbsence(card.noLogo?.reason);
    out.push({
      key: "noLogo",
      label: "no logo",
      tone: card.noLogo ? "plain" : "unk",
      title: absence.title,
    });
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Staleness
 * ------------------------------------------------------------------ */

/**
 * Which entries' source records have changed underneath them.
 *
 * Keyed on `IndexRow.rec`, the per-record sha — NOT on `publish_id`, which is
 * corpus-wide and would badge every card in every group on any regeneration,
 * including one that changed nothing about these churches.
 *
 * A church missing from the index has LEFT the dataset. That is not staleness:
 * the frozen card is now the only copy, and there is nothing to re-pull from.
 */
export function staleEntries(group: ExportGroup, recByOrg: Map<string, string>): Set<string> {
  const out = new Set<string>();
  for (const e of group.entries) {
    const live = recByOrg.get(e.orgId);
    if (live && e.rec && live !== e.rec) out.add(e.orgId);
  }
  return out;
}

/** Churches in the group that the current publish no longer carries. */
export function departedEntries(group: ExportGroup, recByOrg: Map<string, string>): Set<string> {
  return new Set(group.entries.filter((e) => !recByOrg.has(e.orgId)).map((e) => e.orgId));
}

/* ------------------------------------------------------------------ *
 * Operations
 * ------------------------------------------------------------------ */

function withEntry(
  group: ExportGroup,
  orgId: string,
  fn: (e: GroupEntry) => GroupEntry,
): ExportGroup {
  let hit = false;
  const entries = group.entries.map((e) => {
    if (e.orgId !== orgId) return e;
    hit = true;
    return fn(e);
  });
  return hit ? { ...group, entries } : group;
}

function setField(
  entry: GroupEntry,
  path: string,
  value: string,
  base: string,
  at: number,
): GroupEntry {
  const prior = entry.edits.fields[path];
  // The base must stay the ORIGINAL pipeline value across successive edits. If
  // each edit reset it to the previous text, "revert" would walk back one step
  // instead of returning to what the church actually said.
  const trueBase = prior ? prior.base : base;
  const fields = { ...entry.edits.fields };
  if (value === trueBase) {
    // Typed back to the original. That is a revert, and a revert removes the key
    // — otherwise the card keeps claiming to be edited when it is not.
    delete fields[path];
  } else {
    fields[path] = { value, base: trueBase, at };
  }
  return { ...entry, edits: { ...entry.edits, fields } };
}

function revertField(entry: GroupEntry, path: string): GroupEntry {
  if (!(path in entry.edits.fields)) return entry;
  const fields = { ...entry.edits.fields };
  delete fields[path];
  return { ...entry, edits: { ...entry.edits, fields } };
}

function suppress(entry: GroupEntry, itemId: string, at: number): GroupEntry {
  /**
   * Only pipeline items can be suppressed. A hand-added item has no original to
   * fall back to, so hiding it would leave a row nobody can explain or remove.
   *
   * THE LOGO IS THE FOURTH KIND, and leaving it out made the whole remove-logo
   * feature inert. `LOGO_ITEM_ID` is not a step, a pathway step or a contact, so
   * `known` was false and this returned the entry UNCHANGED — in the browser,
   * where the optimistic fold runs this same pure function, and again on the
   * server. The ✕ did nothing, silently, and `sanitizeOp` was happy to carry the
   * op both ways.
   *
   * The tests missed it because they build `edits.suppressed` by hand and only
   * ever drove `applyOp` for `item.restore` — which has no gate, so `put back`
   * worked and there was simply never anything to put back. See the test named
   * "the ✕ on the logo actually removes it".
   *
   * `!!snapshot.logo` and not a bare allow: suppressing a logo the snapshot does
   * not have would let a card claim a reviewer removed something that was never
   * there — the same fact `resolve()` is careful about when it computes
   * `logoRemoved`.
   */
  const known = entry.snapshot.steps.some((s) => s.id === itemId)
    || entry.snapshot.pathway.steps.some((s) => s.id === itemId)
    || entry.snapshot.contacts.some((c) => c.id === itemId)
    || (itemId === LOGO_ITEM_ID && !!entry.snapshot.logo);
  if (!known || entry.edits.suppressed[itemId] != null) return entry;
  return {
    ...entry,
    edits: { ...entry.edits, suppressed: { ...entry.edits.suppressed, [itemId]: at } },
  };
}

function restore(entry: GroupEntry, itemId: string): GroupEntry {
  if (entry.edits.suppressed[itemId] == null) return entry;
  const suppressed = { ...entry.edits.suppressed };
  delete suppressed[itemId];
  return { ...entry, edits: { ...entry.edits, suppressed } };
}

/**
 * Choose a different logo, or `null` to go back to the pipeline's.
 *
 * PICKING OURS AGAIN IS A REVERT, not a stored choice that happens to match —
 * the same rule `setField` applies when somebody types a value back to its
 * original. It keeps "did a human overrule us here?" answerable by the presence
 * of the key alone, which is what `logoSwitched` and `editedCount` both read.
 */
function pickLogo(entry: GroupEntry, logo: SnapshotLogo | null): GroupEntry {
  const edits = { ...entry.edits };
  if (!logo || logo.sha === entry.snapshot.logo?.sha) delete edits.logoPick;
  else edits.logoPick = logo;
  /**
   * A NEW PICTURE HAS NO CROP. The trim was made against particular pixels, and
   * carrying it over would draw one mark's rectangle on another — most picks are
   * wordmarks and most alternatives are icons, so the result is a slice of an
   * image nobody chose. `resolve()` refuses it on the sha too; this is what stops
   * it from lying dormant in the blob and coming back when the reviewer switches
   * to that mark again.
   */
  const next = (edits.logoPick ?? entry.snapshot.logo)?.sha;
  if (edits.logoCrop && edits.logoCrop.sha !== next) delete edits.logoCrop;
  return { ...entry, edits };
}

/** Store the trimmed image, or `null` to go back to the whole one. */
function cropLogo(entry: GroupEntry, crop: LogoCrop | null): GroupEntry {
  const edits = { ...entry.edits };
  if (!crop) delete edits.logoCrop;
  else edits.logoCrop = crop;
  return { ...entry, edits };
}

/**
 * Address the email to one contact, or `null` to let the ranking decide.
 *
 * THE ID IS CHECKED AGAINST THE CARD, unlike most stored choices here: a
 * `sendTo` naming a contact that does not exist would silently resolve to "the
 * ranking decides" while the entry claimed a decision had been made, and the one
 * thing this feature exists to remove is the doubt about which address gets
 * written to. A hand-added contact counts; a struck-out one does not need to be
 * excluded here, because striking one out is itself reversible and
 * `exportContacts` already refuses to ship it.
 */
function setSendTo(entry: GroupEntry, contactId: string | null): GroupEntry {
  const edits = { ...entry.edits };
  const known =
    !!contactId &&
    (entry.snapshot.contacts.some((c) => c.id === contactId) ||
      entry.edits.added.some((i) => i.kind === "contact" && i.id === contactId));
  if (!known) delete edits.sendTo;
  else edits.sendTo = contactId;
  return { ...entry, edits };
}

/**
 * The order a list was dragged into.
 *
 * IDS ARE FILTERED TO THE ONES THIS ENTRY HAS. The op carries a whole list from
 * a browser that may be a save behind, so an id it names may already be gone —
 * and an order holding ghosts would push every real step below them the moment
 * one was re-added under the same id. An order that ends up naming nothing is
 * stored as nothing, which is the same as never having reordered.
 */
function reorder(entry: GroupEntry, list: "steps" | "pathway", ids: string[]): GroupEntry {
  const known = new Set<string>(
    list === "steps"
      ? [
          ...entry.snapshot.steps.map((s) => s.id),
          ...entry.edits.added.filter((i) => i.kind === "step").map((i) => i.id),
        ]
      : [
          ...entry.snapshot.pathway.steps.map((s) => s.id),
          ...entry.edits.added.filter((i) => i.kind === "pathwayStep").map((i) => i.id),
        ],
  );
  const seen = new Set<string>();
  const clean = ids.filter((id) => known.has(id) && !seen.has(id) && seen.add(id));

  const order: NonNullable<EntryEdits["order"]> = { ...entry.edits.order };
  if (clean.length) order[list] = clean;
  else delete order[list];

  const edits: EntryEdits = { ...entry.edits, order };
  // An empty object would make `editedCount` and every `order?.steps` test read
  // the same as an absent one while still writing a key into the blob forever.
  if (!order.steps?.length && !order.pathway?.length) delete edits.order;
  return { ...entry, edits };
}

/** Override the measured accent, or `null` to go back to it. */
function setAccent(entry: GroupEntry, accent: string | null): GroupEntry {
  const edits = { ...entry.edits };
  if (!accent) delete edits.accent;
  else edits.accent = accent;
  return { ...entry, edits };
}

function addItem(entry: GroupEntry, item: AddedItem): GroupEntry {
  if (entry.edits.added.some((i) => i.id === item.id)) return entry;
  return { ...entry, edits: { ...entry.edits, added: [...entry.edits.added, item] } };
}

/**
 * Hard delete — but only for something a person added.
 *
 * This is the asymmetry the whole feature turns on. Pipeline data is evidence:
 * striking it out is a judgement a reviewer can change their mind about, so it
 * stays visible and revertible. A line a person typed has no evidentiary value
 * to preserve; deleting it should delete it.
 */
function removeAdded(entry: GroupEntry, itemId: string): GroupEntry {
  if (!entry.edits.added.some((i) => i.id === itemId)) return entry;
  const added = entry.edits.added.filter((i) => i.id !== itemId);
  const prefixes = pathPrefixFor(itemId);
  const fields = Object.fromEntries(
    // Its edits go with it. Orphaned keys would silently reattach if an id were
    // ever reused, and they would count toward the "edited" badge forever.
    Object.entries(entry.edits.fields).filter(([p]) => !prefixes.some((pre) => p.startsWith(pre))),
  );
  return { ...entry, edits: { ...entry.edits, added, fields } };
}

/** Fold one operation into a group. Pure; the caller stamps `updatedAt`/`rev`. */
export function applyOp(group: ExportGroup, op: GroupOp, at: number): ExportGroup {
  switch (op.op) {
    case "group.rename":
      return { ...group, name: op.name };
    case "field.set":
      return withEntry(group, op.orgId, (e) => setField(e, op.path, op.value, op.base, at));
    case "field.revert":
      return withEntry(group, op.orgId, (e) => revertField(e, op.path));
    case "item.suppress":
      return withEntry(group, op.orgId, (e) => suppress(e, op.itemId, at));
    case "item.restore":
      return withEntry(group, op.orgId, (e) => restore(e, op.itemId));
    case "item.add":
      return withEntry(group, op.orgId, (e) => addItem(e, op.item));
    case "item.remove":
      return withEntry(group, op.orgId, (e) => removeAdded(e, op.itemId));
    case "logo.pick":
      return withEntry(group, op.orgId, (e) => pickLogo(e, op.logo));
    case "logo.crop":
      return withEntry(group, op.orgId, (e) => cropLogo(e, op.crop));
    case "contact.sendTo":
      return withEntry(group, op.orgId, (e) => setSendTo(e, op.contactId));
    case "items.reorder":
      return withEntry(group, op.orgId, (e) => reorder(e, op.list, op.ids));
    case "accent.set":
      return withEntry(group, op.orgId, (e) => setAccent(e, op.accent));
    case "church.remove":
      return { ...group, entries: group.entries.filter((e) => e.orgId !== op.orgId) };
    default:
      return group;
  }
}

export function applyOps(group: ExportGroup, ops: GroupOp[], at: number): ExportGroup {
  return ops.reduce((g, op) => applyOp(g, op, at), group);
}

/* ------------------------------------------------------------------ *
 * Membership
 * ------------------------------------------------------------------ */

/**
 * Which batches each church is in, built from the batches themselves.
 *
 * IDS AND NAMES ONLY, and that is a rule rather than an optimisation. The
 * console asks for this on every load — it is the one group response nobody
 * clicks for — so it must stay proportional to what has been collected rather
 * than to the corpus. Letting a snapshot through here would put every quote and
 * every contact of every collected church on the critical path of opening the
 * page. There is a test asserting the shape, because the leak would be silent:
 * everything would still work, just slower every day.
 */
export function membershipFrom(
  groups: readonly ExportGroup[],
  /**
   * The batch ✆ collects into, from the stored pointer.
   *
   * IT USED TO BE DERIVED HERE — "the first batch whose status is open" — and
   * that was only ever correct because exactly one batch could be open at a
   * time. With `closed` gone, every un-exported batch is open, so the scan would
   * pick whichever the index happened to list first. The pointer is the answer;
   * this function only VALIDATES it, because a stale pointer is the failure mode
   * that matters (a console collecting into a batch that was deleted, or one
   * that has already been sent).
   */
  currentId?: string | null,
): Membership {
  const byOrg: Record<string, MembershipRef[]> = {};
  let openGroupId: string | null = null;

  for (const g of groups) {
    const status = statusOf(g);
    if (g.id === currentId && status !== "exported") openGroupId = g.id;
    const ref: MembershipRef = { id: g.id, name: g.name, status };
    for (const e of g.entries) (byOrg[e.orgId] ??= []).push(ref);
  }

  /**
   * NOTHING VALID SELECTED → the newest batch that can still take churches.
   *
   * Not `null`, because the common path here is not "no batches" — it is a
   * pointer that was never written (every batch collected before this change) or
   * one that names a batch since deleted. Falling back to nothing would show a
   * console with three collectable batches and a tray insisting there were none.
   *
   * The one case that DOES resolve to `null` is every batch being exported,
   * which is exactly right: the next ✆ starts a fresh one.
   */
  if (!openGroupId) {
    const collectable = groups.filter((g) => statusOf(g) !== "exported");
    const newest = collectable.reduce<ExportGroup | null>(
      (best, g) => (!best || g.updatedAt > best.updatedAt ? g : best),
      null,
    );
    openGroupId = newest?.id ?? null;
  }

  /**
   * HOW MUCH WORK EACH CHURCH IN THE OPEN BATCH CARRIES.
   *
   * The console's ✆ removes a church with one click, and `church.remove` drops
   * the whole entry — the frozen snapshot and every correction typed into it —
   * with no undo. The review page has always stopped to say so; the console
   * could not, because membership carries ids and nothing else and the console
   * therefore had no way to know there was anything to lose.
   *
   * COUNTS, NOT CONTENTS, AND ONLY FOR THE OPEN BATCH. This payload is fetched
   * on every console load and the rule for it is that it stays proportional to
   * what you have collected rather than to the corpus; an integer per edited
   * church keeps that, while the resolved cards it is derived from would not.
   * Only the open batch can be uncollected from, so only the open batch is
   * counted. Churches with no edits are ABSENT rather than zero.
   */
  const edited: Record<string, number> = {};
  if (openGroupId) {
    const open = groups.find((g) => g.id === openGroupId);
    for (const e of open?.entries ?? []) {
      // The same three things `ResolvedCard`'s counters are built from, so the
      // number in the dialog cannot disagree with the review page's "N edits".
      // Tolerant of a partial `edits`, because this reads whatever is on disk:
      // a batch written before one of the three existed is still a valid batch,
      // and a counter is not the place to throw over it.
      const ed = e.edits ?? {};
      const n =
        Object.keys(ed.fields ?? {}).length +
        Object.keys(ed.suppressed ?? {}).length +
        (ed.added?.length ?? 0) +
        // The choices that are not typed strings, counted for the same reason:
        // un-collecting throws them away and somebody would have to make them
        // again. See `editedCount` in `resolve`.
        (ed.logoPick ? 1 : 0) +
        (ed.logoCrop ? 1 : 0) +
        (ed.sendTo ? 1 : 0) +
        (ed.accent ? 1 : 0) +
        (ed.order?.steps?.length ? 1 : 0) +
        (ed.order?.pathway?.length ? 1 : 0);
      if (n > 0) edited[e.orgId] = n;
    }
  }

  return { openGroupId, byOrg, edited };
}

/**
 * The status a stored batch actually has.
 *
 * Absent (written before batches existed) and the retired `"closed"` both read as
 * `open` — see `GroupStatus`. One function so the mapping cannot be spelled two
 * ways, which is how a finished batch would end up collectable on one screen and
 * not on another.
 */
export function statusOf(g: { status?: string }): GroupStatus {
  return g.status === "exported" ? "exported" : "open";
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

const PATH_RE = /^(name|slogan|greeting|finding\.(quote|label)|(steps|pathway|contacts)\.[A-Za-z0-9_]{1,64}\.[a-z]{1,12})$/;

function s(v: unknown, max = MAX_FIELD_LEN): string | null {
  return typeof v === "string" && v.length <= max ? v : null;
}

/**
 * A logo the client says the reviewer picked, checked as if it were hostile.
 *
 * THE SHA BECOMES A STORAGE PATH — `logos-thumb/<sha>.webp` — so it is held to
 * the alphabet the asset layer enforces rather than merely to a length. 64 hex
 * characters cannot spell `..`, a slash, or anything else that leaves the
 * prefix, which is the same argument `SAFE_GROUP_ID` makes for group ids.
 *
 * `ext` and `theme` are the pipeline's own vocabularies and are checked against
 * them: an unrecognised theme would fall through `logoPlate`'s default to the
 * checkerboard, which is safe, but storing a value no part of this system emits
 * is how a field stops meaning what its type says.
 */
const LOGO_SHA = /^[a-f0-9]{64}$/;
const LOGO_EXT = new Set(["png", "webp", "jpg", "jpeg", "avif", "svg", "gif"]);
const LOGO_THEME = new Set(["light", "dark", "either", "unknown", ""]);

function cleanLogo(raw: unknown): SnapshotLogo | null {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!o) return null;
  const sha = s(o.sha, 64);
  const ext = s(o.ext, 8);
  const theme = s(o.theme, 16) ?? "";
  if (!sha || !LOGO_SHA.test(sha)) return null;
  if (!ext || !LOGO_EXT.has(ext.toLowerCase())) return null;
  if (!LOGO_THEME.has(theme)) return null;
  return { sha, ext: ext.toLowerCase(), theme };
}

/**
 * A hex colour a person picked, checked as if it were hostile.
 *
 * IT ENDS UP IN A `style` ATTRIBUTE on a page a church opens, so the alphabet is
 * the check — six hex digits cannot spell `url(` or close a quote. Shorthand is
 * expanded rather than rejected: `#fff` is what a person types and what a colour
 * input will happily hand back, and normalising it here means every reader
 * downstream compares one spelling of one colour.
 */
const HEX6 = /^#?[0-9a-fA-F]{6}$/;
const HEX3 = /^#?[0-9a-fA-F]{3}$/;

function cleanHex(raw: unknown): string | null {
  const v = s(raw, 8)?.trim() ?? "";
  if (HEX6.test(v)) return `#${v.replace(/^#/, "").toLowerCase()}`;
  if (HEX3.test(v)) {
    const h = v.replace(/^#/, "").toLowerCase();
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return null;
}

/**
 * The crop the browser says it stored, checked the same way the logo pick is.
 *
 * THE URL IS THE PART THAT MATTERS. It becomes the `<img src>` of a public demo,
 * so it is held to the one shape `putLogo` produces — a same-origin
 * `/api/asset/logos/<sha256>.<ext>` path — rather than to "looks like a URL".
 * Anything else, including an absolute URL to a host we happen to trust today,
 * is refused: a stored `src` pointing off-origin is how a church's demo would
 * start loading somebody else's image, and there is no reason for one to exist.
 */
const CROP_URL = /^\/api\/asset\/logos\/[a-f0-9]{64}\.[a-z0-9]{2,5}$/;

function cleanCrop(raw: unknown): LogoCrop | null {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!o) return null;
  const sha = s(o.sha, 64);
  const url = s(o.url, 200);
  if (!sha || !LOGO_SHA.test(sha)) return null;
  if (!url || !CROP_URL.test(url)) return null;

  // Normalised, so a rectangle can only ever describe part of its own image.
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1 ? v : null;
  const x = num(o.x), y = num(o.y), w = num(o.w), h = num(o.h);
  if (x == null || y == null || w == null || h == null) return null;
  if (w <= 0 || h <= 0 || x + w > 1.0001 || y + h > 1.0001) return null;
  return { sha, url, x, y, w, h };
}

function cleanAdded(raw: unknown): AddedItem | null {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!o) return null;
  const id = s(o.id, 64);
  if (!id || !ADDED_ID.test(id)) return null;
  const at = typeof o.at === "number" && Number.isFinite(o.at) ? o.at : 0;

  if (o.kind === "step") {
    const label = s(o.label), quote = s(o.quote);
    if (label == null || quote == null) return null;
    return { id, at, kind: "step", label, quote } satisfies AddedStep;
  }
  if (o.kind === "pathwayStep") {
    const label = s(o.label), blurb = s(o.blurb);
    if (label == null || blurb == null) return null;
    return { id, at, kind: "pathwayStep", label, blurb } satisfies AddedPathwayStep;
  }
  if (o.kind === "contact") {
    const name = s(o.name, 200), title = s(o.title, 200), email = s(o.email, 320);
    if (name == null || title == null || email == null) return null;
    return { id, at, kind: "contact", name, title, email } satisfies AddedContact;
  }
  return null;
}

/**
 * Narrow an untrusted operation to one we will run, or reject it.
 *
 * The client is the same person who owns the blob, so this is not a trust
 * boundary in the usual sense — but the path string is a key into stored state
 * and the item id is a key too, and neither may be whatever arrived over the
 * wire. Nothing here writes `sourceUrl`, because no operation can.
 */
export function sanitizeOp(raw: unknown): GroupOp | null {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!o) return null;
  const orgId = s(o.orgId, 128);
  const path = s(o.path, 128);
  const itemId = s(o.itemId, 64);

  switch (o.op) {
    case "group.rename": {
      const name = s(o.name, 120);
      return name && name.trim() ? { op: "group.rename", name: name.trim() } : null;
    }
    case "field.set": {
      const value = s(o.value), base = s(o.base);
      if (!orgId || !path || !PATH_RE.test(path) || value == null || base == null) return null;
      return { op: "field.set", orgId, path, value, base };
    }
    case "field.revert":
      return orgId && path && PATH_RE.test(path) ? { op: "field.revert", orgId, path } : null;
    case "item.suppress":
      return orgId && itemId ? { op: "item.suppress", orgId, itemId } : null;
    case "item.restore":
      return orgId && itemId ? { op: "item.restore", orgId, itemId } : null;
    case "item.add": {
      const item = cleanAdded(o.item);
      return orgId && item ? { op: "item.add", orgId, item } : null;
    }
    case "item.remove":
      return orgId && itemId ? { op: "item.remove", orgId, itemId } : null;
    case "logo.pick": {
      // `null` is a legitimate body — it means "go back to ours" — so absence is
      // distinguished from a malformed logo rather than lumped in with it.
      if (!orgId) return null;
      if (o.logo === null) return { op: "logo.pick", orgId, logo: null };
      const logo = cleanLogo(o.logo);
      return logo ? { op: "logo.pick", orgId, logo } : null;
    }
    case "logo.crop": {
      // Same shape as `logo.pick`: `null` is a legitimate body meaning "the whole
      // image again", so absence is distinguished from a malformed crop.
      if (!orgId) return null;
      if (o.crop === null) return { op: "logo.crop", orgId, crop: null };
      const crop = cleanCrop(o.crop);
      return crop ? { op: "logo.crop", orgId, crop } : null;
    }
    case "contact.sendTo": {
      if (!orgId) return null;
      if (o.contactId === null) return { op: "contact.sendTo", orgId, contactId: null };
      // The same alphabet item ids are held to everywhere else here — snapshot
      // ids are category keys and `u_` hex, and this one is about to be compared
      // against them.
      const contactId = s(o.contactId, 64);
      return contactId && /^[A-Za-z0-9_]{1,64}$/.test(contactId)
        ? { op: "contact.sendTo", orgId, contactId }
        : null;
    }
    case "items.reorder": {
      const list = o.list === "steps" || o.list === "pathway" ? o.list : null;
      if (!orgId || !list || !Array.isArray(o.ids)) return null;
      /**
       * A BOUND, because this is the one op whose body is a list. 200 is far
       * above any real church — the widest pathway in the corpus is single
       * digits — and `reorder` filters to ids the entry actually has, so the cap
       * is a guard against a payload rather than a limit anybody can reach.
       */
      if (o.ids.length > 200) return null;
      const ids = o.ids.map((v) => s(v, 64) ?? "");
      if (ids.some((id) => !id || !/^[A-Za-z0-9_]{1,64}$/.test(id))) return null;
      return { op: "items.reorder", orgId, list, ids };
    }
    case "accent.set": {
      if (!orgId) return null;
      if (o.accent === null) return { op: "accent.set", orgId, accent: null };
      const accent = cleanHex(o.accent);
      return accent ? { op: "accent.set", orgId, accent } : null;
    }
    case "church.remove":
      return orgId ? { op: "church.remove", orgId } : null;
    default:
      return null;
  }
}

/**
 * The name a batch gets when nobody names it.
 *
 * IT USED TO BE THE DATE, FULL STOP, and that was correct while there was one
 * batch a day: `openGroup` found the open one, so a second `Aug 2` could not
 * exist. Batches are no longer per-day — finishing one and collecting again makes
 * another the same afternoon — and two rows both reading `Aug 2` in a picker
 * whose entire job is telling them apart is the failure that change introduces.
 *
 * So: the date, and a counter ONLY when the date is taken. The common case reads
 * exactly as before.
 *
 *   Aug 2 · Aug 2 · 2 · Aug 2 · 3
 *
 * COUNTED FROM THE NAMES THAT EXIST, not from a stored sequence. A counter on the
 * user's record would drift the moment a batch was renamed or deleted, and would
 * have to be migrated; this cannot, because it is derived every time. It also
 * means a renamed batch frees its number back up, which is the behaviour somebody
 * renaming `Aug 2` to `Charlotte` would expect.
 */
export function nextBatchName(existing: readonly string[], now: Date): string {
  const base = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const taken = new Set(existing.map((n) => n.trim()));
  if (!taken.has(base)) return base;
  // The bound is a runaway guard, not a real limit: 999 batches in one day is not
  // a person collecting churches. Falling through to the clock keeps it unique
  // rather than looping or colliding.
  for (let n = 2; n <= 999; n++) {
    const candidate = `${base} · ${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base} · ${now.toISOString().slice(11, 19)}`;
}

/** A URL-safe group id from a name plus a short disambiguating suffix. */
export function makeExportGroupId(name: string, suffix: string): string {
  const base = String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const id = `${base || "group"}-${suffix}`;
  // Belt and braces: the id is about to become part of a storage key.
  return isSafeGroupId(id) ? id : `group-${suffix}`;
}

export { isSafeGroupId };
