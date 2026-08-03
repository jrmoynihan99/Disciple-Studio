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
  ExportGroup,
  GroupEntry,
  GroupOp,
  GroupStatus,
  ResolvedCard,
  ResolvedContact,
  ResolvedPathwayStep,
  ResolvedSlogan,
  ResolvedStep,
  Membership,
  MembershipRef,
  SnapshotContact,
  SnapshotStep,
  Voice,
} from "./group-types.ts";
import { PATH, isSafeGroupId, pathPrefixFor, pathwayIsOrdered } from "./group-types.ts";

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
 * The slogan's three states, preserved through editing.
 *
 * Editing it to empty is a person asserting there is no slogan — a different
 * fact from "we only read the homepage", and it must not silently become one.
 */
function resolveSlogan(entry: GroupEntry): ResolvedSlogan {
  const s = entry.snapshot.slogan;
  const e = edit(entry, PATH.slogan);
  if (e) {
    return e.value
      ? { kind: "slogan", voice: editedVoice(e.value, e.base) }
      : { kind: "none" };
  }
  if (s.text) {
    // The slogan is the church's own voice but comes off a <title> — there is no
    // anchor on a page to point a reader at.
    return { kind: "slogan", voice: { text: s.text, attribution: { kind: "uncited", note: "from the site's title" } } };
  }
  return s.scope ? { kind: "homepage_only" } : { kind: "none" };
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
      label: labelEdit
        ? editedVoice(labelEdit.value, labelEdit.base)
        : s.generated
          ? // WE INVENTED THIS ONE. `generated` renders, always, because the
            // alternative is a fabricated step sitting in a list of observed ones
            // looking exactly like them — see `Attribution`.
            { text: title.text, attribution: { kind: "generated" } }
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

  return out;
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
    steps.push({
      id: item.id,
      provenance: "user",
      suppressed: false,
      ordinal: numbered ? p.steps.length + i + 1 : null,
      label: userVoice(labelEdit ? labelEdit.value : item.label),
      blurb: blurbEdit ? blurbEdit.value : item.blurb,
      quote: null,
    });
  });

  return { steps, numbered };
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

  return {
    orgId: entry.orgId,
    stale: false,
    name: resolveName(entry),
    // The pre-repair name is shown as evidence for the repair. Once a person
    // renames the church themselves, the repair is no longer what produced what
    // you see, so its working stops being relevant.
    nameOriginal: !nameEdited && s.nameRepair ? s.nameOriginal : "",
    churchUrl: s.churchUrl,
    logo: s.logo,
    noLogo: s.noLogo,
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
    editedCount: Object.keys(entry.edits.fields).length,
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
   * ONE FLAG FOR BOTH ABSENCES.
   *
   * `slogan.kind` still distinguishes `homepage_only` from `none` and the
   * resolver and its tests still defend that — but the console no longer names
   * the difference. There used to be a second chip reading "slogan: homepage
   * only", explaining that /about was never fetched; that is a fact about our
   * crawl, in pipeline vocabulary, on a card a salesperson reads before phoning
   * a church. Owner's call to drop it.
   *
   * The flag itself stays for both, because "this church has no slogan" is a
   * thing the reviewer has to notice and fix by hand either way.
   */
  if (card.slogan.kind !== "slogan") {
    out.push({
      key: "slogan",
      label: "no slogan",
      tone: "plain",
      title: "No slogan was extracted for this church. Click the line to add one.",
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
  // Only pipeline items can be suppressed. A hand-added item has no original to
  // fall back to, so hiding it would leave a row nobody can explain or remove.
  const known = entry.snapshot.steps.some((s) => s.id === itemId)
    || entry.snapshot.pathway.steps.some((s) => s.id === itemId)
    || entry.snapshot.contacts.some((c) => c.id === itemId);
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

  return { openGroupId, byOrg };
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

const PATH_RE = /^(name|slogan|finding\.(quote|label)|(steps|pathway|contacts)\.[A-Za-z0-9_]{1,64}\.[a-z]{1,12})$/;

function s(v: unknown, max = MAX_FIELD_LEN): string | null {
  return typeof v === "string" && v.length <= max ? v : null;
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
