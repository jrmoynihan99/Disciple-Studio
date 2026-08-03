/**
 * The shapes an export group is made of.
 *
 * An export group is a curated batch of churches, frozen at the moment they were
 * added, that a person reads and corrects before it goes out. Two things make it
 * different from everything else in this engine:
 *
 *  1. It is the first WRITABLE church data. Everything else here projects the
 *     pipeline's output; a group carries a human's corrections on top of it.
 *  2. Those corrections change what we are allowed to CLAIM. A quote we edited is
 *     no longer the church's words, and must stop being presented as them.
 *
 * Point 2 is enforced by the type system rather than by convention — see
 * `Attribution`. Conventions drift; this codebase has already lost one that way.
 */

import type { StepState, VerdictState } from "./types.ts";

/** Bumped when a stored group can no longer be read by `resolve()` as written. */
export const GROUP_SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ *
 * Identity
 * ------------------------------------------------------------------ */

/**
 * A group id is echoed into an R2 KEY (`state/leads/groups/<uid>/<id>.json`),
 * so it is checked against a fixed alphabet before a pathname is ever built —
 * the same rule `identity.ts` applies to user ids and `fixture.ts` applies to
 * `org_id`, for the same reason. No dots, so `..` cannot be spelled.
 */
export const SAFE_GROUP_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function isSafeGroupId(v: unknown): v is string {
  return typeof v === "string" && SAFE_GROUP_ID.test(v);
}

/* ------------------------------------------------------------------ *
 * Attribution — the load-bearing type
 * ------------------------------------------------------------------ */

/**
 * Where a displayed string came from, and therefore what it may claim.
 *
 * THE POINT OF THIS UNION: only `cited` has a `sourceUrl` field. Not "an
 * optional one" — the property does not exist on the other three variants, so a
 * component that renders `attribution.sourceUrl` for an edited quote fails
 * `tsc --noEmit`, which already runs in `npm run verify`.
 *
 * That matters because the check we have today cannot catch this. The audit's
 * quote sweep walks record JSON and inherits `source_url` from ANY ancestor, so
 * an edited quote sitting beside the pipeline's original URL passes green while
 * telling a salesperson a church said something it never said.
 *
 *   cited     the church's words, quoted from a page we can link to
 *   uncited   the church's words, with no page citation to give (a slogan is
 *             usually lifted from a <title>; there is no anchor to point at)
 *   edited    we changed the text. It is no longer a quotation of anything.
 *   user      a person typed it. The church never said it at all.
 *   generated WE invented it. The church never said it at all either.
 *   editedGenerated
 *             we invented it AND a person then rewrote it. Still not the
 *             church's words — see below.
 *
 * WHY `editedGenerated` IS ITS OWN VARIANT AND NOT JUST `edited`.
 *
 * `resolveSteps` tested the label edit before `s.generated`, so one keystroke on
 * a fabricated step's title turned `{kind:"generated"}` into
 * `{kind:"edited", wasVerbatim:"Attend a Worship Service"}` — a string WE wrote.
 * The card then said "edited — no longer the church's words" over a revert
 * button titled `Original: Attend a Worship Service`, which asserts twice over
 * that the church ever said it. It did not; the pipeline fabricates that step on
 * all 15,273 records. This is precisely the confusion the union exists to make
 * impossible, so the honest answer keeps the fabrication visible and still
 * offers our text back.
 *
 * `generated` is `user` with a different author, and it exists because the v2
 * corpus fabricates one next step per church — an "Attend a Worship Service" row
 * with `flags:["synthesized"]`, no name of its own, no quote and no source URL,
 * on all 15,273 churches. Rendered like a found step it reads as something we
 * observed on their site. It is not. A reviewer about to write to a congregation
 * has to be able to tell the two apart at a glance, which is the whole reason
 * this union is a union.
 */
export type Attribution =
  | { kind: "cited"; sourceUrl: string; verified: string }
  | { kind: "uncited"; note: string }
  | { kind: "edited"; wasVerbatim: string }
  | { kind: "user" }
  | { kind: "generated" }
  /** `wasGenerated` is OUR fabricated text, never a church's. Deliberately not
   *  named `wasVerbatim`: nothing here was ever verbatim anything. */
  | { kind: "editedGenerated"; wasGenerated: string };

/** A rendered string together with the claim it is allowed to make. */
export interface Voice {
  text: string;
  attribution: Attribution;
}

/** Did this item come out of the pipeline, or did a person type it? */
export type Provenance = "source" | "user";

/* ------------------------------------------------------------------ *
 * The frozen snapshot
 * ------------------------------------------------------------------ */

export interface SnapshotLogo {
  /**
   * The 64-hex CONTENT sha that names the file on disk — `IndexRow.lo`, and only
   * that. `record.brand.logo_sha8` is an unrelated 8-hex digest that looks like
   * it would work and 404s on every card. Measured on `abernethymmc_org`:
   * `d7148b5e…0c22` (real) vs `06ddbc5d` (the decoy).
   */
  sha: string;
  ext: string;
  /** `IndexRow.lt` — decides the plate, via `logoPlate()`. Carry it or a
   *  near-white cut-out renders invisible on a white card. */
  theme: string;
}

/** Why there is no logo. "None found" and "found one, rejected it" differ. */
export interface SnapshotNoLogo {
  reason: string;
}

export interface SnapshotSlogan {
  text: string;
  /**
   * `brand.slogan_scope`. THREE states, not two, and the scope is what tells
   * them apart:
   *   text set                 → the slogan
   *   text "", scope set       → none on the homepage; inner pages never read
   *   text "", scope ""        → we looked and there is none
   * Dropping the scope when the text is empty collapses a "we didn't look" into
   * a "there isn't one", which is an assertion of absence.
   */
  scope: string;
}

/** The pre-repair name plus the citation that justified repairing it. */
export interface SnapshotNameRepair {
  was: string;
  quote: string;
  sourceUrl: string;
  verified: string;
}

export interface SnapshotStep {
  /** Stable for the life of the entry. A churning id makes every revert a
   *  silent no-op, so it is derived from the category key, not an array index. */
  id: string;
  key: string;
  label: string;
  state: StepState;
  /**
   * THE CHURCH'S OWN WORDS, on a v1 snapshot only.
   *
   * v1 built a step per CATEGORY and had to choose between our category label and
   * the church's own term; `stepTitle` in `group.ts` still makes that choice for
   * batches frozen back then. v2 reads `next_steps[]`, where the choice is
   * already made and lands in `label`, so it writes `[]` here — which is exactly
   * what makes `stepTitle` a no-op on a v2 step. The field stays because a
   * snapshot is frozen and those older batches must keep resolving as they did.
   */
  ownTerms: string[];
  /**
   * LEGACY, and read only by `stepTitle` on a v1 snapshot.
   *
   * It briefly held a rating for `ownTerms[0]` that the corpus never actually
   * shipped. v2 moved the whole decision upstream into `final_name`, so nothing
   * writes this any more — but a batch collected while it existed still has it on
   * disk, and dropping it from the type would make that stored value invisible to
   * the rule that is still supposed to read it.
   */
  titleConfidence?: string;
  /**
   * The church's own word for this step, when it differs from the title we chose.
   *
   * NOT RENDERED. It is the audit trail — "we are calling this Get Connected;
   * they call it Connect Card" — and the thing a future "use their word" control
   * would need. Stored now rather than later because a snapshot freezes at collect
   * time: a batch taken without it can never gain it.
   */
  ownName?: string;
  /**
   * WE INVENTED THIS STEP. `flags` contained `synthesized`.
   *
   * Optional so batches frozen before v2 read as `undefined`, which is correct
   * for them — v1 built steps only from categories the church actually offered,
   * so none of them was ever fabricated.
   */
  generated?: boolean;
  quote: string;
  /** Whether the quote is ABOUT this category — a different axis from
   *  `verified`, which only says the span is on the page. Never merge them. */
  quoteConfidence: string;
  verified: string;
  sourceUrl: string;
}

/**
 * `pathway_order_basis` from INDEX-CONTRACT §3.1.
 *
 * Only the first two license printing "Step 1 → Step 4". `page_order` means DOM
 * order and says nothing about sequence, so it renders as an unordered list.
 */
export type PathwayOrderBasis = "explicit_numbered" | "explicit_sequenced" | "page_order";

/**
 * May we print a step number?
 *
 * ONE FUNCTION, because three surfaces ask this question — the batch review
 * card, the console's dossier, and anything an export grows later — and the
 * failure mode of a second copy is invisible. It does not throw or look broken;
 * it just starts telling one reader that a church says "do this first" when the
 * only thing we know is that a heading appeared above another heading in the
 * HTML. That is a claim a cold email gets quoted back on.
 *
 * `null` (the field is absent) is NOT numbered. Absence of a stated basis is not
 * a basis.
 */
export function pathwayIsOrdered(basis: PathwayOrderBasis | null | undefined): boolean {
  return basis === "explicit_numbered" || basis === "explicit_sequenced";
}

export interface SnapshotPathwayStep {
  id: string;
  ordinal: number;
  label: string;
  blurb: string;
  category: string | null;
  categoryRaw: string;
  quote: string;
  sourceUrl: string;
  verified: string;
  /**
   * Proves the label is ON the page. NOT that it is the step's name — page
   * furniture verifies `exact` too. Upstream shipped six footer blocks as steps
   * of a pathway called "LIFE Track" before this distinction was written down.
   */
  labelVerified: string;
}

/** The pathway's own declaration, cited. Null when it cannot be quoted. */
export interface SnapshotFinding {
  answer: string;
  label: string;
  quote: string;
  sourceUrl: string;
  verified: string;
}

export interface SnapshotPathway {
  /** The key was present, which the pipeline writes only for a complete pathway. */
  present: boolean;
  /**
   * WHICH absence this is, when there is no pathway — `""` when there is one.
   *
   * `model_says_no` is a measured negative: we read the site and it publishes no
   * pathway. Everything else, above all `no_declaration_candidate`, means our
   * detector never asked. Collapsing the two would print "no discipleship
   * pathway" over churches nobody looked at, and it is the largest group.
   */
  status: string;
  name: string;
  orderBasis: PathwayOrderBasis | null;
  sourceUrl: string;
  steps: SnapshotPathwayStep[];
  /** Null when the declaration carries no quote, or no page to attribute it to. */
  finding: SnapshotFinding | null;
}

/**
 * The three states every surface must agree on.
 *
 * ONE FUNCTION, for the same reason `pathwayIsOrdered` is one: the list tile,
 * the dossier card and anything an export grows later all ask "what do we know
 * about this church's discipleship pathway", and a second copy of the mapping
 * does not fail loudly — it just tells the list "None" while the dossier says
 * "Not checked" for the same church, and whoever notices has to work out which
 * one is lying.
 *
 *   has        627 churches with an adjudicated pathway
 *   none     4,534 `model_says_no` — we read the site; it publishes none
 *   unknown 10,113 every other status, above all the 9,766 we never checked
 */
export type PathwayKnowledge = "has" | "none" | "unknown";

export function pathwayKnowledge(input: {
  present?: boolean;
  stepCount?: number;
  status?: string;
}): PathwayKnowledge {
  if (input.present || (input.stepCount ?? 0) > 0) return "has";
  return input.status === "model_says_no" ? "none" : "unknown";
}

/**
 * The colour each state paints, in ONE place.
 *
 * The list tile, the dossier card and the facet swatch all show this, and a
 * swatch that disagrees with the rows it filters to is the specific bug the
 * "one source of truth for (question, answer) -> colour" rule exists for.
 */
export const PATHWAY_STATE: Record<PathwayKnowledge, VerdictState> = {
  has: "good",
  none: "bad",
  unknown: "unk",
};

/** How each state reads in a facet dropdown, where there is no room to explain. */
export const PATHWAY_FACET_LABEL: Record<PathwayKnowledge, string> = {
  has: "Has a pathway",
  none: "No pathway published",
  unknown: "Not checked",
};

export type ContactKind = "person" | "churchEmail" | "phone" | "social";

export interface SnapshotContact {
  id: string;
  kind: ContactKind;
  name: string;
  title: string;
  roleLabel: string;
  email: string;
  /** Phone number, or the social profile URL. */
  value: string;
  /** `facebook`, `instagram`, … for socials; "" otherwise. */
  network: string;
}

/**
 * Everything a card shows, frozen at add time.
 *
 * `contact.roster` is deliberately absent: it runs to 102 entries on one church,
 * is dossier-only content, and is the single largest size driver (5.3 KB → 3.4 KB
 * average per church without it). A card's "contacts" means the people you would
 * actually write to.
 */
export interface ChurchSnapshot {
  name: string;
  nameOriginal: string;
  nameRepair: SnapshotNameRepair | null;
  churchUrl: string;
  logo: SnapshotLogo | null;
  noLogo: SnapshotNoLogo | null;
  slogan: SnapshotSlogan;
  stepsLooked: boolean;
  steps: SnapshotStep[];
  pathway: SnapshotPathway;
  contacts: SnapshotContact[];
  /** `contact.note` — the pipeline's own "why nobody is reachable". */
  contactNote: string;
}

/* ------------------------------------------------------------------ *
 * Edits
 * ------------------------------------------------------------------ */

/**
 * One field a person changed.
 *
 * `base` is what it was changed FROM. It is not redundant with the snapshot: it
 * is what lets a future re-pull say "the source text changed underneath 2 of
 * your edits" instead of silently picking a winner. Storing it now costs a
 * string; adding it later costs a blob migration.
 */
export interface FieldEdit {
  value: string;
  base: string;
  at: number;
}

interface AddedBase {
  /** `u_<hex>` — the `u_` prefix is what makes provenance readable in the blob. */
  id: string;
  at: number;
}

export interface AddedStep extends AddedBase {
  kind: "step";
  label: string;
  quote: string;
}

export interface AddedPathwayStep extends AddedBase {
  kind: "pathwayStep";
  label: string;
  blurb: string;
}

export interface AddedContact extends AddedBase {
  kind: "contact";
  name: string;
  title: string;
  email: string;
}

/**
 * Something a person typed that the pipeline never found.
 *
 * NOTE WHAT IS MISSING: there is no `sourceUrl` on any variant, and no way to
 * add one. A hand-written line cannot be attributed to a church's website,
 * because a church's website is not where it came from.
 */
export type AddedItem = AddedStep | AddedPathwayStep | AddedContact;

export interface EntryEdits {
  /**
   * Keyed by field path (see `PATH`). ABSENT means the pipeline's value stands.
   *
   * Reverting DELETES the key — it must never write `""`. An empty string is a
   * legitimate edit ("this slogan is wrong, there isn't one"), and if revert
   * wrote `""` too, the slogan's three states would collapse to two and 83
   * churches would start claiming we looked at pages we never opened.
   */
  fields: Record<string, FieldEdit>;
  /** itemId → suppressedAt. Pipeline items are suppressed, never removed. */
  suppressed: Record<string, number>;
  added: AddedItem[];
}

export interface GroupEntry {
  /** THE key. Never `publish_id`, never a record hash. */
  orgId: string;
  addedAt: number;
  /**
   * `IndexRow.rec` — the per-record sha256 — at snapshot time. This is the
   * staleness key. `publishId` is corpus-wide, so comparing it would badge every
   * card in every group on any regeneration, including one that changed nothing.
   */
  rec: string;
  /** Provenance only. Never compared to decide staleness. */
  publishId: string;
  snapshot: ChurchSnapshot;
  edits: EntryEdits;
}

/**
 * Where a batch is in its life. TWO STATES, and the missing third is the point.
 *
 *   open      it can still be collected into and edited.
 *   exported  demos were generated from it. History; nothing more goes in.
 *
 * THERE USED TO BE A `closed`, AND IT ONLY EXISTED BECAUSE THE EXPORT DID NOT.
 * Its own comment said so: without a real export there was no honest way to
 * finish a batch and start another, and marking one `exported` would have
 * claimed churches had been contacted when they had not. Building the export
 * removed the reason, and what was left was a button that made a batch look
 * finished without anything having happened to it.
 *
 * `closed` is still ACCEPTED ON READ — batches on disk carry it — and
 * `summarize()` maps it to `open`. Dropping it from the union without that would
 * turn every existing finished batch into a parse error.
 *
 * WHICH BATCH ✆ COLLECTS INTO IS NO LONGER DERIVED FROM THIS. It used to be "the
 * one whose status is open", which worked only while exactly one could be. Now
 * every un-exported batch is open, so the target is an explicit pointer — see
 * `readCurrentId` in `lib/leads/server/groups.ts`.
 */
export type GroupStatus = "open" | "exported";

/** What a batch may say on disk, including the retired `closed`. */
export type StoredGroupStatus = GroupStatus | "closed";

export interface ExportGroup {
  schema: number;
  id: string;
  /** From the signed cookie, server-side. Never a body field. */
  userId: string;
  name: string;
  /**
   * Absent on groups written before batches existed, and `"closed"` on ones
   * written while that state existed. `summarize()` maps both to `open`.
   */
  status?: StoredGroupStatus;
  /** Retired with `closed`. Still read off disk, never written. */
  closedAt?: string;
  /**
   * The `/studio` demo group this batch generated, once it has been exported.
   *
   * Stored rather than recomputed because there is nothing to recompute it FROM:
   * the demo group's id carries a random suffix (`makeGroupId`), so losing this
   * loses the only link between a reviewed batch and the demos it produced.
   */
  demoGroupId?: string;
  exportedAt?: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Monotonic write counter. Observability ONLY — no request is ever rejected on
   * it. Blob has no compare-and-swap and its overwrites can take ~60s to clear
   * the CDN, so a rev guard fails in exactly its design case (two tabs, seconds
   * apart, where the read still returns the stale value) and, when it does fire,
   * throws away buffered typing. `BroadcastChannel` handles the real case.
   */
  rev: number;
  entries: GroupEntry[];
}

export interface ExportGroupSummary {
  id: string;
  name: string;
  status: GroupStatus;
  /** Set once exported — the `/studio` demo group this batch produced. */
  demoGroupId?: string;
  count: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Which batches a church is already in.
 *
 * IDS ONLY. The console fetches this on every load and a single group runs to
 * ~210 KB, so answering "have I collected this one before?" by loading groups is
 * not viable at 14k rows. This payload is proportional to what you have
 * collected, not to the corpus.
 *
 * It is what lets the row say `collected Aug 1` — the thing the console could
 * not tell you at all, and the reason the same church kept turning up in a
 * second batch a week later.
 */
export interface MembershipRef {
  id: string;
  name: string;
  status: GroupStatus;
}

export interface Membership {
  /** The batch ✆ collects into. `null` until the first church is collected. */
  openGroupId: string | null;
  byOrg: Record<string, MembershipRef[]>;
  /**
   * How many corrections each church carries IN THE OPEN BATCH. Absent = none.
   *
   * It exists so the console can stop before throwing them away. ✆ un-collects
   * with one click and `church.remove` drops the entry outright, and until this
   * was here the console had no way to know whether that cost nothing or cost an
   * afternoon. See `membershipFrom`, which is the only thing that writes it.
   */
  edited: Record<string, number>;
}

export const EMPTY_MEMBERSHIP: Membership = { openGroupId: null, byOrg: {}, edited: {} };

/**
 * Corrections this church would lose if it were un-collected right now.
 *
 * Tolerates the key being absent, because a `Membership` deserialised from a
 * response written before this field existed is still a valid one.
 */
export function editsInOpenBatch(m: Membership, orgId: string): number {
  return m.edited?.[orgId] ?? 0;
}

/** Is this church in the batch currently being collected? */
export function isCollecting(m: Membership, orgId: string): boolean {
  return !!m.openGroupId && (m.byOrg[orgId] ?? []).some((g) => g.id === m.openGroupId);
}

/**
 * How many churches the open batch is collecting THAT THIS CONSOLE CAN SHOW.
 *
 * The rail used to count `byOrg` outright, and the two numbers on screen then
 * disagreed by construction: batch membership is stored per user and outlives a
 * republish, so a church collected against an earlier corpus keeps its entry
 * after its `org_id` leaves the dataset. The rail said "2 churches in this
 * batch", not one row rendered as collecting — a row can only render for a
 * church the publish still carries — and the deck's own "already collected",
 * which counts rows, said 0. Both were honest about different sets, which is the
 * worst kind of disagreement: neither number looks wrong on its own.
 *
 * NOTHING IS DELETED. The entry keeps its frozen snapshot, the review page keeps
 * showing it, and `departedEntries` keeps flagging it there — this is a counter
 * agreeing with the list beside it, not a prune.
 */
export function collectingCount(m: Membership, present: (orgId: string) => boolean): number {
  let n = 0;
  for (const orgId of Object.keys(m.byOrg)) {
    if (present(orgId) && isCollecting(m, orgId)) n++;
  }
  return n;
}

/**
 * Batches this church is in OTHER than the open one.
 *
 * The distinction is load-bearing: a church in the open batch is today's work
 * and must keep its place in the list, while one in an earlier batch is already
 * handled and sinks. Collapsing the two would reshuffle the list under someone
 * mid-collection.
 */
export function earlierBatches(m: Membership, orgId: string): MembershipRef[] {
  return (m.byOrg[orgId] ?? []).filter((g) => g.id !== m.openGroupId);
}

/* ------------------------------------------------------------------ *
 * Field paths
 * ------------------------------------------------------------------ */

/**
 * Every editable field's path, built in one place.
 *
 * Hand-added items live in the same id namespace as snapshot items, so an added
 * step's quote is edited through exactly the same path grammar as a pipeline
 * step's. That is what keeps `resolve()` from needing two code paths.
 */
export const PATH = {
  name: "name",
  slogan: "slogan",
  step: (id: string, field: "label" | "quote") => `steps.${id}.${field}`,
  pathwayStep: (id: string, field: "label" | "blurb" | "quote") => `pathway.${id}.${field}`,
  finding: (field: "quote" | "label") => `finding.${field}`,
  contact: (id: string, field: "name" | "title" | "email" | "value") =>
    `contacts.${id}.${field}`,
} as const;

/**
 * THE ORDER A CHURCH IS READ IN, AND THE FULL LIST — no field is ever omitted.
 *
 * The review page used to drop a block when there was nothing in it, so a church
 * with no pathway simply rendered shorter than its neighbours. That is the exact
 * failure the page exists to prevent: an absence read as a shorter card rather
 * than as a missing fact, and the eye has nothing to catch on while skimming.
 *
 * Every pass renders all five, in this order, on every church, and tags each
 * block `data-field="<id>"`. `/leads/audit` asserts both the presence and the
 * order, which is why this lives in the engine rather than in a component: a
 * constant a test reads is a constant a redesign cannot quietly shorten.
 *
 * `name` and `slogan` are the identity header rather than rows in the stream —
 * they are still fields, still always rendered, still in this order. `website`
 * used to be one and is not any more: it collapsed into the Visit button, which
 * is the same control the console uses and is the only outbound link on a card.
 */
export const REVIEW_FIELDS = ["name", "slogan", "steps", "pathway", "contacts"] as const;

export type ReviewField = (typeof REVIEW_FIELDS)[number];

/**
 * THE LOGO, AS A SUPPRESSIBLE ITEM.
 *
 * A wrong logo is the one error on a card that a reviewer could see and not fix:
 * the pipeline sometimes ships a stock photo, a sponsor's mark or another
 * church's badge, and until now the only options were to send it or to remove
 * the whole church.
 *
 * IT REUSES `item.suppress`/`item.restore` RATHER THAN GETTING ITS OWN OP, and
 * that is the point. Those two already carry everything this needs — they are
 * reversible, they are counted in `suppressedCount`, they survive a reload, they
 * are already validated by `sanitizeOp`, and `resolve()` is already the single
 * place that folds them. A `logo.remove` op would have been a second mechanism
 * for "a reviewer took this off the card", and the two would eventually disagree
 * about what a struck item means.
 *
 * A fixed id rather than a derived one because a card has exactly one logo. It
 * cannot collide with a snapshot item id (those are category keys and `u_` hex)
 * and it matches the safe-id alphabet `sanitizeOp` enforces.
 */
export const LOGO_ITEM_ID = "logo";

/** Every field path belonging to one item, for pruning on hard delete. */
export function pathPrefixFor(itemId: string): string[] {
  return [`steps.${itemId}.`, `pathway.${itemId}.`, `contacts.${itemId}.`];
}

/* ------------------------------------------------------------------ *
 * Operations — the PATCH delta
 * ------------------------------------------------------------------ */

/**
 * What the client sends. NOT the snapshot.
 *
 * The client never round-trips snapshots, for three reasons that all point the
 * same way: a 40-church group is ~210 KB and the `pagehide` flush uses
 * `keepalive`, which the Fetch spec caps at 64 KiB — so a snapshot save would
 * SILENTLY fail on any group past about a dozen churches; ops drop a minute of
 * typing from ~3 MB to ~30 KB; and a snapshot the client cannot send is a
 * snapshot the client cannot forge.
 */
export type GroupOp =
  | { op: "group.rename"; name: string }
  | { op: "field.set"; orgId: string; path: string; value: string; base: string }
  | { op: "field.revert"; orgId: string; path: string }
  | { op: "item.suppress"; orgId: string; itemId: string }
  | { op: "item.restore"; orgId: string; itemId: string }
  | { op: "item.add"; orgId: string; item: AddedItem }
  | { op: "item.remove"; orgId: string; itemId: string }
  | { op: "church.remove"; orgId: string };

/* ------------------------------------------------------------------ *
 * The resolved render model
 * ------------------------------------------------------------------ */

/**
 * NO `ownTerms` HERE, AND THAT IS THE POINT.
 *
 * A step used to resolve to our category name plus a row of read-only chips
 * carrying the church's own words, and nobody reading the page could tell which
 * of the two was the thing that would actually be sent. `label` is now THE
 * Title — one string, already chosen between the two sources by `stepTitle`,
 * editable, and the only candidate. The chips are gone and the raw terms stay in
 * the snapshot where they belong.
 */
export interface ResolvedStep {
  id: string;
  provenance: Provenance;
  suppressed: boolean;
  key: string;
  state: StepState | null;
  label: Voice;
  quote: Voice | null;
}

export interface ResolvedPathwayStep {
  id: string;
  provenance: Provenance;
  suppressed: boolean;
  /** null when the order basis does not license a number. */
  ordinal: number | null;
  /**
   * Already the church's own step name ("Adult Inquirers Class"), not a category
   * of ours — so unlike `ResolvedStep.label` it needs no rule to choose it. It
   * carried a `categoryRaw` chip beside it for symmetry with next steps; that
   * went when the chips did.
   */
  label: Voice;
  blurb: string;
  quote: Voice | null;
}

export interface ResolvedContact {
  id: string;
  provenance: Provenance;
  suppressed: boolean;
  kind: ContactKind;
  name: string;
  title: string;
  roleLabel: string;
  email: string;
  value: string;
  network: string;
  edited: boolean;
}

/** The slogan's three states, resolved. */
export type ResolvedSlogan =
  | { kind: "slogan"; voice: Voice }
  | { kind: "homepage_only" }
  | { kind: "none" };

export interface ResolvedCard {
  orgId: string;
  /** The record sha moved under us. Set by `staleEntries`, not by `resolve`. */
  stale: boolean;
  name: Voice;
  /** "" unless the pipeline repaired the name and we still stand behind it. */
  nameOriginal: string;
  churchUrl: string;
  /** `null` when the pipeline found none OR the reviewer removed the one it found. */
  logo: SnapshotLogo | null;
  noLogo: SnapshotNoLogo | null;
  /**
   * A REVIEWER TOOK THE LOGO OFF, as opposed to there never having been one.
   *
   * Two different facts that both render as an empty plate, and the card has to
   * tell them apart — one offers `put back`, the other has nothing to put back.
   * It is also what stops the export from shipping a logo somebody rejected:
   * `toRawChurch` reads `card.logo`, which is already null here.
   */
  logoRemoved: boolean;
  slogan: ResolvedSlogan;
  stepsLooked: boolean;
  steps: ResolvedStep[];
  pathway: {
    name: string;
    numbered: boolean;
    finding: Voice | null;
    steps: ResolvedPathwayStep[];
  };
  contacts: ResolvedContact[];
  contactNote: string;
  editedCount: number;
  suppressedCount: number;
}
