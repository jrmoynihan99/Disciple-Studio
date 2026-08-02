/**
 * Freezing a church into an export group.
 *
 * A group is reviewed once and sent once, so what it holds must be what the
 * reviewer saw. `INDEX-CONTRACT.md` §6 puts it plainly: *"An answer can change
 * for a church already exported. Each export event therefore stores its
 * publish_id and a frozen snapshot of the exported rows — otherwise 'what did we
 * send them in July?' becomes unanswerable."*
 *
 * So this builds a copy, not a reference. It is PURE — no fetch, no fs, no Blob —
 * which is what lets the tests run it over all 134 real churches.
 *
 * IT NEEDS BOTH SOURCES, and that is not an oversight: the logo's content sha
 * exists only on the index row, and the quotes exist only on the record.
 */

import { decodeEntities } from "./text.ts";
import { safeEmail, safeUrl } from "./url.ts";
import { recordLabel } from "./labels.ts";
import { nextStepsSummary } from "./steps.ts";
import type { ChurchRecord, IndexRow, StepCategory } from "./types.ts";
import type {
  AddedItem,
  ChurchSnapshot,
  ContactKind,
  GroupEntry,
  PathwayOrderBasis,
  SnapshotContact,
  SnapshotFinding,
  SnapshotNameRepair,
  SnapshotPathway,
  SnapshotPathwayStep,
  SnapshotStep,
} from "./group-types.ts";

const ORDER_BASES: readonly string[] = [
  "explicit_numbered",
  "explicit_sequenced",
  "page_order",
];

/** Every scraped string is entity-encoded and rendered as a text node. */
function txt(v: unknown): string {
  return decodeEntities(String(v ?? "")).trim();
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/* ------------------------------------------------------------------ *
 * Name
 * ------------------------------------------------------------------ */

/**
 * The name repair is itself a cited claim — 34 of 134 names were rebuilt from a
 * quoted `og:title` — so the card can show its working. Carried whole or not at
 * all; a repair without its quote is just an unexplained rename.
 */
function nameRepairOf(rec: ChurchRecord): SnapshotNameRepair | null {
  const nr = obj((rec as unknown as Record<string, unknown>).name_repair);
  const quote = txt(nr.quote);
  const was = txt(nr.was);
  if (!quote && !was) return null;
  return {
    was,
    quote,
    sourceUrl: safeUrl(nr.source_url),
    verified: str(nr.verified),
  };
}

/* ------------------------------------------------------------------ *
 * Next steps
 * ------------------------------------------------------------------ */

/**
 * Only the categories the church actually offers.
 *
 * `absent_looked` is a real and useful fact in the dossier — it is how a reader
 * knows we checked — but it is not export content; nobody writes to a church
 * about a step it does not have. The "we looked at all" fact survives separately
 * as `stepsLooked`, so an empty list still reads as "we checked, found none"
 * rather than "not checked".
 */
function stepsOf(rec: ChurchRecord): SnapshotStep[] {
  const summary = nextStepsSummary(rec);
  return summary.present.map((c: StepCategory) => ({
    // Derived from the category key, never an array index: if a republish drops
    // one category, index-based ids would shift every step below it and silently
    // reattach every edit to the wrong step.
    id: `s_${c.key}`,
    key: c.key,
    label: txt(c.label),
    state: c.state ?? "present",
    ownTerms: (c.own_terms ?? []).map(txt).filter(Boolean),
    // Cite or abstain, same rule as the pathway steps: one category in the v2
    // corpus carries a quote with no `source_url`, and a snapshot is the artifact
    // that leaves the building. The CATEGORY still ships — "they offer baptism"
    // is a state we adjudicated, not a sentence we are attributing.
    ...(safeUrl(c.source_url)
      ? {
          quote: txt(c.quote),
          quoteConfidence: str(c.quote_confidence),
          verified: str(c.verified),
          sourceUrl: safeUrl(c.source_url),
        }
      : { quote: "", quoteConfidence: "", verified: "", sourceUrl: "" }),
  }));
}

/* ------------------------------------------------------------------ *
 * Discipleship pathway
 * ------------------------------------------------------------------ */

/**
 * The adjudicated discipleship pathway — read from `record.discipleship_pathway`
 * and from nothing else.
 *
 * IT USED TO READ `q1`, AND THAT WAS WRONG IN TWO DIRECTIONS.
 *
 * `q1.pathway_steps` was the flat forward-contract shape that never shipped; the
 * pipeline split it into an adjudicated object and `q1` kept only the question.
 * Worse was the fallback to `next_steps_by_category.pathway_name`, which
 * `01-DOMAIN.md` names explicitly: that field is *"a scalar observation and NOT
 * proof of a pathway — it is dropped from the exported package for that
 * reason."* 853 churches carry it while having no pathway at all, so the
 * fallback would have invented a named journey for every one of them.
 *
 * AN ABSENT KEY IS THE ANSWER, NOT A HOLE. The pipeline writes the object only
 * when at least two steps survived verification, so there is no such thing as an
 * empty pathway: 627 churches have one, and the other 14,647 carry a
 * `discipleship_pathway_status` saying WHICH absence it is. That distinction is
 * carried through to `status` here rather than collapsed, because "we read the
 * site and it publishes no pathway" and "our detector never looked" are
 * different claims and only one of them may be shown as a finding of ours.
 *
 * EXPORTED so the list tile and the dossier read the pathway through one
 * function. A hand-rolled `record.discipleship_pathway.steps.map(...)` in a
 * component is the failure that drifts silently — the two renderings disagree
 * only for churches whose data nobody has looked at yet.
 */
export function pathwayOf(rec: ChurchRecord): SnapshotPathway {
  const p = obj((rec as unknown as Record<string, unknown>).discipleship_pathway);
  const present = Object.keys(p).length > 0;

  const rawBasis = str(p.order_basis);
  const orderBasis = (ORDER_BASES.includes(rawBasis) ? rawBasis : null) as
    | PathwayOrderBasis
    | null;

  const pathwayUrl = safeUrl(p.source_url);

  const steps: SnapshotPathwayStep[] = arr(p.steps).map((raw, i) => {
    const s = obj(raw);
    const ordinal = typeof s.order === "number" ? s.order : i + 1;

    /**
     * CITE OR ABSTAIN, PER STEP.
     *
     * A step quote may carry its own URL or inherit the pathway's — but 22 of
     * the 627 pathways ship with `source_url: ""`, and their 59 step quotes have
     * no page anywhere up the tree. Rendering those would put an unattributed
     * sentence in a cold email, which is the one thing the evidence rules exist
     * to stop. The STEP survives; only its quote is withheld, because the step's
     * name is a label we adjudicated rather than a claim we are quoting.
     *
     * `verified: "failed"` means the span was NOT found on the page. Today the
     * pipeline already moves those into `quote_rejected` and leaves `quote`
     * empty, so this branch is belt-and-braces — but it is the difference
     * between depending on that and assuming it.
     */
    const stepUrl = safeUrl(s.source_url) || pathwayUrl;
    const verified = str(s.verified);
    const quote = stepUrl && verified !== "failed" ? txt(s.quote) : "";

    return {
      id: `p_${ordinal}`,
      ordinal,
      label: txt(s.name),
      // No `blurb` in the adjudicated shape — 0 of 2,376 steps carry one. Kept
      // in the type because the batch card renders it when it exists.
      blurb: txt(s.blurb),
      category: typeof s.category === "string" && s.category ? s.category : null,
      categoryRaw: txt(s.category_raw),
      quote,
      sourceUrl: quote ? stepUrl : "",
      verified,
      labelVerified: str(s.name_verified),
    };
  });

  /**
   * The finding is the pathway's OWN declaration, not q1's answer.
   *
   * q1 is retired from display, and reviving it here to fill this slot would be
   * the same "third spelling of one fact" the domain doc warns about — the card
   * would cite a discipleship claim adjudicated by a different question than the
   * one whose steps it is showing.
   */
  const quote = txt(p.declaration_quote);
  const finding: SnapshotFinding | null =
    present && quote && pathwayUrl
      ? {
          answer: str(p.purpose),
          label: recordLabel(p.name),
          quote,
          sourceUrl: pathwayUrl,
          verified: str(p.name_confidence),
        }
      : null;

  return {
    present,
    status: present ? "" : str((rec as unknown as Record<string, unknown>).discipleship_pathway_status),
    name: txt(p.name),
    orderBasis,
    sourceUrl: pathwayUrl,
    steps,
    finding,
  };
}

/* ------------------------------------------------------------------ *
 * Contacts
 * ------------------------------------------------------------------ */

function contact(
  id: string,
  kind: ContactKind,
  over: Partial<SnapshotContact>,
): SnapshotContact {
  return {
    id,
    kind,
    name: "",
    title: "",
    roleLabel: "",
    email: "",
    value: "",
    network: "",
    ...over,
  };
}

/**
 * The people you would actually write to.
 *
 * `recommended` (48 churches) and `church_emails` (104) together cover every
 * church that has any contact at all — verified: 0 churches have a `preview`
 * entry without one of these two, so the index's `em` projection adds nothing.
 *
 * `contact.roster` is deliberately excluded. It reaches 102 entries on one
 * church, it is the largest single size driver, and it is reference material for
 * the dossier rather than something you put in front of a church.
 */
function contactsOf(rec: ChurchRecord): SnapshotContact[] {
  const c = obj(rec.contact);
  const out: SnapshotContact[] = [];
  const seen = new Set<string>();

  arr(c.recommended).forEach((raw, i) => {
    const p = obj(raw);
    const email = safeEmail(p.email);
    const name = txt(p.name);
    if (!email && !name) return;
    if (email) seen.add(email);
    out.push(
      contact(`c_rec_${i}`, "person", {
        name,
        title: txt(p.title),
        roleLabel: txt(p.role_label),
        email,
      }),
    );
  });

  // The communications lead is often the best single contact and is not always
  // in `recommended` — on one church it is the only address we have.
  const comms = obj(c.comms);
  const commsEmail = safeEmail(comms.email);
  if (commsEmail && !seen.has(commsEmail)) {
    seen.add(commsEmail);
    out.push(
      contact("c_comms", "person", {
        name: txt(comms.name),
        title: txt(comms.title),
        roleLabel: txt(comms.role_label),
        email: commsEmail,
      }),
    );
  }

  arr(c.church_emails).forEach((raw, i) => {
    const e = obj(raw);
    const email = safeEmail(e.email);
    if (!email || seen.has(email)) return;
    seen.add(email);
    out.push(
      contact(`c_em_${i}`, "churchEmail", {
        // Per-address label ("Generic church email"), not a blanket phrase.
        title: txt(e.label),
        name: txt(e.name),
        email,
      }),
    );
  });

  const phone = txt(c.phone);
  if (phone) out.push(contact("c_phone", "phone", { value: phone }));

  for (const [network, url] of Object.entries(obj(c.social))) {
    const href = safeUrl(url);
    if (!href) continue;
    out.push(contact(`c_social_${network}`, "social", { network, value: href }));
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * The builder
 * ------------------------------------------------------------------ */

/**
 * Freeze one church.
 *
 * @param row the index row — the ONLY source of the logo's content sha
 * @param rec the full record — the only source of quotes, contacts and slogan
 */
export function buildSnapshot(row: IndexRow, rec: ChurchRecord): ChurchSnapshot {
  if (rec._synthetic) {
    // The 10 edge-case records are fabricated. They exist to prove the renderer
    // survives hostile input; they are not churches and must never be published,
    // counted in a total, exported, or shown to a user.
    throw new Error(`refusing to snapshot a synthetic record: ${rec.org_id}`);
  }

  const brand = obj(rec.brand);

  // The logo sha lives on the INDEX ROW and nowhere else. `brand.logo_sha8` is an
  // 8-hex digest of something else entirely and 404s against the asset route.
  const logo =
    row.lo && row.lx
      ? { sha: row.lo, ext: row.lx, theme: str(row.lt) }
      : null;
  const reason = txt(row.lr) || txt(brand.logo_absent_reason) || txt(brand.logo_reject);

  return {
    name: txt(rec.name) || txt(row.n),
    nameOriginal: txt((rec as unknown as Record<string, unknown>).name_original),
    nameRepair: nameRepairOf(rec),
    churchUrl: safeUrl(rec.own_url) || safeUrl(rec.church_url),
    logo,
    noLogo: logo ? null : { reason: reason || "no logo found" },
    slogan: {
      text: txt(brand.slogan),
      // Kept even when the text is empty — it is the difference between "there
      // is no slogan" and "we only read the homepage".
      scope: str(brand.slogan_scope),
    },
    stepsLooked: !!obj(rec.next_steps_by_category).looked,
    steps: stepsOf(rec),
    pathway: pathwayOf(rec),
    contacts: contactsOf(rec),
    contactNote: txt(obj(rec.contact).note),
  };
}

/** A fresh entry: frozen data, no edits yet. */
export function buildEntry(row: IndexRow, rec: ChurchRecord, publishId: string, at: number): GroupEntry {
  return {
    orgId: rec.org_id,
    addedAt: at,
    // The per-record sha — the staleness key. `publishId` is corpus-wide and
    // would badge every card at once on any regeneration.
    rec: str(row.rec),
    publishId,
    snapshot: buildSnapshot(row, rec),
    edits: { fields: {}, suppressed: {}, added: [] as AddedItem[] },
  };
}
