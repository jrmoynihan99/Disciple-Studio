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
 * A group id is echoed into a Vercel Blob KEY (`leads/groups/<uid>/<id>.json`),
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
 */
export type Attribution =
  | { kind: "cited"; sourceUrl: string; verified: string }
  | { kind: "uncited"; note: string }
  | { kind: "edited"; wasVerbatim: string }
  | { kind: "user" };

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
  /** THE CHURCH'S OWN WORDS. Verbatim — never normalised or title-cased. */
  ownTerms: string[];
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
 * Where a batch is in its life.
 *
 *   open      ✆ collects into it. There is at most ONE, which is the whole
 *             reason nobody has to create or name a group: the batch is implied
 *             by the work and named afterwards, if at all.
 *   closed    you stopped collecting into it. Nothing was sent.
 *   exported  it went out.
 *
 * `closed` exists because the export does not. Without it there would be no
 * honest way to finish a batch and start tomorrow's — the only alternative was
 * marking it `exported`, which would claim churches had been contacted when they
 * had not, and ◎ exists precisely to stop that claim being made loosely.
 */
export type GroupStatus = "open" | "closed" | "exported";

export interface ExportGroup {
  schema: number;
  id: string;
  /** From the signed cookie, server-side. Never a body field. */
  userId: string;
  name: string;
  /** Absent on groups written before batches existed; read as `open`. */
  status?: GroupStatus;
  closedAt?: string;
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
}

export const EMPTY_MEMBERSHIP: Membership = { openGroupId: null, byOrg: {} };

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
  | { op: "church.remove"; orgId: string }
  /** Stop collecting into this batch. Not "sent" — nothing has been sent. */
  | { op: "group.close" };

/* ------------------------------------------------------------------ *
 * The resolved render model
 * ------------------------------------------------------------------ */

export interface ResolvedStep {
  id: string;
  provenance: Provenance;
  suppressed: boolean;
  key: string;
  state: StepState | null;
  ownTerms: string[];
  label: Voice;
  quote: Voice | null;
}

export interface ResolvedPathwayStep {
  id: string;
  provenance: Provenance;
  suppressed: boolean;
  /** null when the order basis does not license a number. */
  ordinal: number | null;
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
  logo: SnapshotLogo | null;
  noLogo: SnapshotNoLogo | null;
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
