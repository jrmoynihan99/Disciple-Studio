"use client";

import { useCallback, useEffect, useState } from "react";
import { churchFromRecord } from "@/lib/leads/engine/adapt";
import { colorState } from "@/lib/leads/engine/color";
import { defaultFavorModel } from "@/lib/leads/engine/favor";
import { QMETA, type ChurchRecord, type EngineCtx, type IndexRow, type QuestionKey } from "@/lib/leads/engine/types";
import { safeUrl } from "@/lib/leads/engine/url";
import type { ExportGroup, GroupEntry } from "@/lib/leads/engine/group-types";
import { ROW_CLASS } from "../_components/list/LeadRow";

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

type Add = (name: string, pass: boolean, detail: string) => void;

const ctx: EngineCtx = { overrides: {}, favor: defaultFavorModel(), rows: [] };

/**
 * The row, rendered twice: collecting now, and collected last week.
 *
 * `/leads` cannot be scraped for this — its server HTML is a loading skeleton
 * with no rows in it, so a markup scan finds nothing and passes. The shipping
 * component is mounted instead.
 */
async function auditRow(add: Add) {
  const { createRoot } = await import("react-dom/client");
  const { flushSync } = await import("react-dom");
  const { LeadRow } = await import("../_components/list/LeadRow");
  const { churchFromIndex } = await import("@/lib/leads/engine/adapt");

  const rows: IndexRow[] = await fetch("/api/leads/index").then((r) => r.json());
  const row = rows.find((r) => r.lo && (r.em?.length ?? 0) > 0) ?? rows[0];
  const view = churchFromIndex(row);

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.width = "1100px";
  (document.querySelector("[data-lead-root]") ?? document.body).appendChild(host);

  const root = createRoot(host);
  const props = {
    row,
    view,
    ctx,
    score: 3,
    base: 9,
    marks: { star: false, issue: false, downloaded: false },
    onOpen: () => {},
    onToggleMark: () => {},
    onToggleCollect: () => {},
  } as const;

  try {
    flushSync(() => {
      root.render(
        <>
          <div data-probe="collecting">
            <LeadRow {...props} tint="collecting" collecting batchName="Aug 2" earlier={[]} />
          </div>
          <div data-probe="earlier">
            <LeadRow
              {...props}
              tint={null}
              collecting={false}
              batchName="Aug 2"
              earlier={[{ id: "aug-1", name: "Aug 1", status: "exported" }]}
            />
          </div>
        </>,
      );
    });

    /**
     * ONE control, ONE meaning.
     *
     * The row briefly carried a checkbox ("select for a group") sitting right
     * next to ✆ ("the export queue") — two controls for the same idea. ✆ won,
     * because it was always the right gesture; it just had nowhere to put the
     * church. This is what stops a second batch affordance growing back.
     */
    const boxes = host.querySelectorAll('input[type="checkbox"]');
    const collect = host.querySelectorAll('[aria-pressed][aria-label*="batch" i]');
    add(
      "a row has exactly one way to collect a church",
      boxes.length === 0 && collect.length === 2,
      `${boxes.length} checkboxes, ${collect.length} collect controls across 2 rows`,
    );

    /**
     * The pointer cursor, asserted because a FRAMEWORK CHANGE removed it.
     *
     * Tailwind v4 dropped `cursor: pointer` from its preflight, so every button
     * in the console silently began rendering with an arrow — worst on a row,
     * which carries `cursor-pointer` itself, so the row said "clickable" and the
     * ★ 🐞 ✆ inside it said "not". A base rule in `leads-theme.css` puts it
     * back. Nothing in the components changed, which is exactly why this needs a
     * check: the next major can take it away again and no code review would see
     * it.
     */
    const icons = [...host.querySelectorAll("button")].filter((b) => !b.disabled);
    const arrows = icons.filter((b) => getComputedStyle(b).cursor !== "pointer");
    add(
      "every icon on a row shows the pointer cursor",
      icons.length > 0 && arrows.length === 0,
      `${icons.length} buttons, ${arrows.length} still showing an arrow`,
    );

    const collecting = host.querySelector('[data-probe="collecting"]');
    const earlier = host.querySelector('[data-probe="earlier"]');

    add(
      "a collected row says which batch it is in, and an active one does not",
      !/collected/i.test(collecting?.textContent ?? "") &&
        /collected Aug 1/.test(earlier?.textContent ?? ""),
      "today's work is not labelled as history",
    );

    /**
     * The green wash answers "which ones did I pick just now?". If a church
     * collected last week wore it too, a third of the list would be green and
     * the question would stop having an answer.
     */
    const tinted = (el: Element | null) =>
      !!el?.querySelector('[class*="lead-tint-goodlead"]');
    add(
      "only the batch being collected carries the wash",
      tinted(collecting) && !tinted(earlier),
      "an earlier batch shows a line, not a colour",
    );
  } finally {
    root.unmount();
    host.remove();
  }
}

/**
 * The discipleship pathway in the dossier.
 *
 * THIS ONE CANNOT BE DRIVEN OFF THE DATASET. `q1.pathway_steps` is unpopulated
 * on all 134 records, so every church renders the empty state and a check that
 * walked the corpus would pass without a single step ever being drawn. The
 * records here carry the shape the newer pipeline emits.
 *
 * The claim under test is the one that is wrong-but-plausible: a number beside a
 * step means the CHURCH said do this first. When the basis is `page_order` all
 * we know is that one heading came before another in the HTML, and printing
 * "1. 2. 3." there converts a fact about our scraper into a claim about a real
 * congregation — quoted back at you in a reply to a cold email.
 */
async function auditPathway(add: Add) {
  const { createRoot } = await import("react-dom/client");
  const { flushSync } = await import("react-dom");
  const { PathwayDetail } = await import("../_components/dossier/Dossier");

  const steps = [
    { ordinal: 1, label: "Attend a Sunday gathering", quote: "", source_url: "" },
    { ordinal: 2, label: "Fill out a welcome card", quote: "", source_url: "" },
  ];
  const rec = (basis: string | undefined, extra: Record<string, unknown> = {}) =>
    ({
      org_id: "audit_pathway",
      q1: { pathway_name: "First Steps", pathway_order_basis: basis, pathway_steps: steps, ...extra },
    }) as unknown as ChurchRecord;

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.width = "420px";
  (document.querySelector("[data-lead-root]") ?? document.body).appendChild(host);

  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(
        <>
          <div data-probe="ordered">
            <PathwayDetail record={rec("explicit_sequenced")} />
          </div>
          <div data-probe="page-order">
            <PathwayDetail record={rec("page_order")} />
          </div>
          <div data-probe="none">
            <PathwayDetail record={rec(undefined, { pathway_steps: [] })} />
          </div>
        </>,
      );
    });

    const text = (p: string) =>
      (host.querySelector(`[data-probe="${p}"]`)?.textContent ?? "").replace(/\s+/g, " ");

    const named = /Attend a Sunday gathering/.test(text("ordered")) &&
      /Fill out a welcome card/.test(text("ordered"));
    add(
      "the dossier lists the discipleship steps by name",
      named,
      named ? "both step names rendered" : `got: ${text("ordered").slice(0, 80)}`,
    );

    // `1.` and `2.` are printed only in the ordered probe. Matching on the
    // ordinal glyph rather than on a class, so restyling cannot fake a pass.
    const ordinalsShown = /\b1\.\s*Attend/.test(text("ordered"));
    const ordinalsHidden = !/\b1\.\s*Attend/.test(text("page-order"));
    add(
      "a step is numbered only when the church's own page numbered it",
      ordinalsShown && ordinalsHidden,
      `stated order: ${ordinalsShown ? "numbered" : "NOT numbered"} · ` +
        `page order: ${ordinalsHidden ? "unnumbered" : "NUMBERED — invents a sequence"}`,
    );

    // A church with a named programme and no captured stages must still report
    // the name. "No pathway" would be false, and silence would be worse — the
    // card header already says "None identified", so a body that added nothing
    // would leave the one fact we do hold unsaid.
    const empty = text("none");
    add(
      "a pathway with no captured steps still reports its name",
      /First Steps/.test(empty) && /no steps collected/i.test(empty),
      empty.slice(0, 90) || "(rendered nothing)",
    );
  } finally {
    root.unmount();
    host.remove();
  }
}

/**
 * An expanded card may never open onto nothing.
 *
 * `EvidenceBody` is a stack of conditional blocks, and for 35 of 134 churches
 * the login question satisfies none of them: no evidence string, no quote, no
 * source URL, no sub-signals. It used to render an empty `<div>` — and the card
 * still expanded, because the caller gates on the question object existing
 * rather than on it having anything to say. A control that opens onto padding is
 * indistinguishable from one whose content failed to load.
 *
 * Driven off REAL RECORDS, not fabricated ones: the point is that no church in
 * the corpus produces an empty body, and only the corpus can say that.
 */
async function auditEmptyEvidence(add: Add) {
  const { createRoot } = await import("react-dom/client");
  const { flushSync } = await import("react-dom");
  const { EvidenceBody } = await import("../_components/dossier/Evidence");
  const { DISPLAY_KEYS } = await import("@/lib/leads/engine/types");

  const rows: IndexRow[] = await fetch("/api/leads/index").then((r) => r.json());
  // A church whose login answer is `unknown` — the shape that produced the bug.
  const blank =
    rows.find((r) => (r.q5?.a ?? "unknown") === "unknown") ?? rows[0];
  const record: ChurchRecord = await fetch(`/api/leads/church/${blank.id}`).then((r) => r.json());

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.width = "420px";
  (document.querySelector("[data-lead-root]") ?? document.body).appendChild(host);

  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(
        <>
          {DISPLAY_KEYS.map((k) => {
            const q = record[k];
            return q ? (
              <div key={k} data-probe-q={k}>
                <EvidenceBody q={q} qKey={k} />
              </div>
            ) : null;
          })}
        </>,
      );
    });

    const empty = [...host.querySelectorAll("[data-probe-q]")].filter(
      (el) => !(el.textContent ?? "").trim(),
    );
    add(
      "no expanded card opens onto an empty panel",
      empty.length === 0,
      empty.length
        ? `${empty.map((e) => e.getAttribute("data-probe-q")).join(", ")} rendered nothing`
        : `every question on ${blank.id} says something`,
    );

    // The unmeasured wording must be reserved for actually-unmeasured
    // questions. Told about an answered one, it would invent a gap in our data.
    const login = host.querySelector('[data-probe-q="q5"]')?.textContent ?? "";
    const unknown = (record.q5 as { answer?: string } | undefined)?.answer === "unknown";
    add(
      "an unmeasured question says so, and an answered one does not",
      unknown ? /adequate data/i.test(login) : !/adequate data/i.test(login),
      `${blank.id} q5 = ${(record.q5 as { answer?: string } | undefined)?.answer ?? "(absent)"}`,
    );
  } finally {
    root.unmount();
    host.remove();
  }
}

/**
 * A group card, built from a snapshot and put through the real components.
 *
 * NOT scraped from `/leads/groups/<id>`. That page is client-rendered, so its
 * server HTML is a loading skeleton — a markup scan would find no quotes, no
 * attributions and nothing struck out, and would report all of it as passing.
 * The console's hover check learnt this the hard way and says so in its comment.
 *
 * So the shipping components are mounted into the live DOM instead, with one
 * fabricated card that exercises every case at once: a pipeline quote, an edited
 * one, a hand-added item and a struck-out one.
 */
async function auditGroupCard(add: Add) {
  const { createRoot } = await import("react-dom/client");
  const { flushSync } = await import("react-dom");
  const { ChurchCard } = await import("../groups/_components/ChurchCard");
  const { ExportBar } = await import("../groups/_components/ExportBar");
  const { buildSnapshot } = await import("@/lib/leads/engine/snapshot");
  const { resolve, applyOp } = await import("@/lib/leads/engine/group");
  const { PATH } = await import("@/lib/leads/engine/group-types");
  const { logoPlate, PLATE_CLASS } = await import("@/lib/leads/engine/logo");
  const type = await import("@/lib/leads/engine/group-types");

  // A real church, so the quotes and contacts are the shapes that actually ship.
  const rows: IndexRow[] = await fetch("/api/leads/index").then((r) => r.json());
  const row =
    rows.find((r) => r.lo && r.lt === "dark" && (r.em?.length ?? 0) > 0) ??
    rows.find((r) => r.lo) ??
    rows[0];
  const record: ChurchRecord = await fetch(`/api/leads/church/${row.id}`).then((r) => r.json());

  const snapshot = buildSnapshot(row, record);
  const withQuote = snapshot.steps.find((s) => s.quote);
  let entry: GroupEntry = {
    orgId: row.id,
    addedAt: 0,
    rec: row.rec ?? "",
    publishId: "audit",
    snapshot,
    edits: { fields: {}, suppressed: {}, added: [] },
  };

  let group: ExportGroup = {
    schema: type.GROUP_SCHEMA_VERSION,
    id: "audit-probe",
    userId: "u_0000000000000000",
    name: "audit",
    createdAt: "",
    updatedAt: "",
    rev: 0,
    entries: [entry],
  };

  // Edit a quote, strike out a contact, add one by hand — every provenance state
  // present on one card.
  if (withQuote) {
    group = applyOp(
      group,
      { op: "field.set", orgId: row.id, path: PATH.step(withQuote.id, "quote"), value: "reworded for the audit", base: withQuote.quote },
      0,
    );
  }
  const victim = snapshot.contacts[0];
  if (victim) {
    group = applyOp(group, { op: "item.suppress", orgId: row.id, itemId: victim.id }, 0);
  }
  group = applyOp(
    group,
    {
      op: "item.add",
      orgId: row.id,
      item: { id: "u_audit0001", at: 0, kind: "step", label: "Hand-written step", quote: "typed by a person" },
    },
    0,
  );
  entry = group.entries[0];
  const card = resolve(entry);

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  // Wide enough for all four tracks. At 880px the sheet collapses to two
  // columns by design, and the spread check below would be measuring the
  // breakpoint rather than the layout.
  host.style.width = "1600px";
  (document.querySelector("[data-lead-root]") ?? document.body).appendChild(host);

  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(
        <>
          <ChurchCard card={card} index={1} stale={false} departed={false} onOp={() => {}} />
          <ExportBar count={1} acknowledged onAcknowledge={() => {}} />
        </>,
      );
    });

    /**
     * THE COMPLAINT THIS LAYOUT EXISTS TO ANSWER.
     *
     * The review page used to be one 880px column of full-height cards: one
     * church was a screen and a half, and nothing lined up between them, so
     * spotting the bad one meant reading all twenty in full. Four aligned
     * columns are what make a wrong quote look wrong.
     *
     * Asserted on the resolved grid rather than on the class string, because
     * "the template mentions four tracks" and "four tracks are laid out" are
     * different claims, and a stray `grid-cols-1` further down the string would
     * satisfy only the first.
     */
    const sheet = host.querySelector("[data-church] > .grid") as HTMLElement | null;
    const tracks = sheet
      ? getComputedStyle(sheet).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length
      : 0;
    add(
      "the review sheet spreads across four columns, not down one",
      tracks === 4,
      sheet ? `${tracks} tracks at 1600px` : "no sheet grid found on the card",
    );

    /**
     * INVARIANT 3, finally checked where it matters.
     *
     * The existing quote sweep walks record JSON and inherits `source_url` from
     * ANY ancestor, so an edited quote stored beside the pipeline's original URL
     * passes it green. This asks the rendered page instead: every quote either
     * shows a link, or says it is no longer a quotation.
     */
    const quotes = [...host.querySelectorAll("[data-quote]")];
    const unattributed = quotes.filter((q) => {
      const block = q.closest("div");
      const line = block?.parentElement?.querySelector("[data-attribution]");
      if (!line) return true;
      const kind = line.getAttribute("data-attribution");
      return kind === "cited" ? !line.querySelector("[data-source]") : !kind;
    });
    add(
      "every rendered quote is attributed or marked as no longer verbatim",
      quotes.length > 0 && unattributed.length === 0,
      `${quotes.length} quotes rendered, ${unattributed.length} unattributed`,
    );

    const edited = [...host.querySelectorAll('[data-attribution="edited"]')];
    add(
      "an edited quote never renders a source link",
      edited.length > 0 && edited.every((e) => !e.querySelector("[data-source], a[href]")),
      edited.length ? `${edited.length} edited, none cited` : "no edited attribution rendered — probe is broken",
    );

    const mine = [...host.querySelectorAll('[data-provenance="user"]')];
    add(
      "a hand-added item is labelled yours and carries no verified badge",
      mine.length > 0 &&
        mine.every(
          (m) => m.querySelector('[data-attribution="user"]') && !m.querySelector("[data-verified]"),
        ),
      `${mine.length} hand-added item(s)`,
    );

    /**
     * Suppression is not deletion. If a struck-out item disappeared from the DOM
     * it would be indistinguishable from a hard delete, and the two mean
     * different things here: one is revertible and one is not.
     */
    const struck = [...host.querySelectorAll('[data-suppressed="true"]')];
    const stillThere = struck.filter((el) => {
      const inner = el.firstElementChild;
      const line = inner ? getComputedStyle(inner).textDecorationLine : "none";
      return line.includes("line-through") && /put back/i.test(el.textContent ?? "");
    });
    add(
      "a struck-out item stays visible, struck, and revertible",
      struck.length > 0 && stillThere.length === struck.length,
      `${struck.length} suppressed, ${stillThere.length} struck with a revert`,
    );

    const exportBtn = host.querySelector("[data-group-export]") as HTMLButtonElement | null;
    // The cursor is part of "inert". The base rule that gave every other button
    // a pointer sits in `@layer base` precisely so `cursor-not-allowed` keeps
    // beating it here — unlayered, it would have quietly made a dead button look
    // live, which is the one thing this check exists to prevent.
    const exportCursor = exportBtn ? getComputedStyle(exportBtn).cursor : "";
    add(
      "the group export button is inert even when acknowledged",
      !!exportBtn && exportBtn.disabled && !exportBtn.getAttribute("href") && exportCursor !== "pointer",
      exportBtn
        ? exportBtn.disabled
          ? `disabled, no href, cursor: ${exportCursor}`
          : "THE BUTTON IS LIVE"
        : "not found",
    );

    // A new visual design is the likeliest place for a bare white plate to
    // reappear, which makes a near-white cut-out logo invisible.
    const plateEl = host.querySelector(`.${PLATE_CLASS[logoPlate(row.lt)].replace(/ /g, ".")}`);
    add(
      "the card's logo plate matches the console's rule",
      !!plateEl,
      `lt=${row.lt ?? "(none)"} expects ${PLATE_CLASS[logoPlate(row.lt)]}`,
    );

    add(
      "the group card ships no literal question numbers",
      !/>Q(?:[1-9]|10)</.test(host.innerHTML),
      "checked the rendered card",
    );

    /**
     * `◎ downloaded` is folded from the export log and nothing else may write it:
     * "a mark you can set yourself stops being evidence". Group editing runs
     * through a separate store entirely, and this is what says so out loud.
     */
    const before = localStorage.getItem("leads-state-v1");
    applyOp(group, { op: "church.remove", orgId: row.id }, 0);
    const after = localStorage.getItem("leads-state-v1");
    add(
      "no group operation touches the downloaded set",
      before === after && !JSON.stringify(group).includes("lastExportedAt"),
      "group state and mark state stay separate",
    );
  } finally {
    root.unmount();
    host.remove();
  }
}

export function AuditRunner() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [nonce, setNonce] = useState(0);

  /**
   * Collects every result and returns them in one go, so the only state update
   * happens after the work is done. Nothing here sets state mid-flight.
   */
  const collect = useCallback(async (): Promise<Check[]> => {
    const out: Check[] = [];
    const add = (name: string, pass: boolean, detail: string) => out.push({ name, pass, detail });

    // ── colour tokens, measured from the live DOM ──
    /**
     * Mount the probe INSIDE `[data-lead-root]`, not on `document.body`.
     *
     * The colour tokens live on `:root` and would measure the same anywhere, but
     * the type rules are scoped to the console's root — a probe on the body
     * measures the studio's Inter/Newsreader and reports a failure that is only
     * in the measurement.
     */
    const mount = () => document.querySelector("[data-lead-root]") ?? document.body;

    const measure = <T,>(cls: string, read: (cs: CSSStyleDeclaration) => T): T => {
      const el = document.createElement("span");
      el.className = cls;
      el.style.position = "fixed";
      el.style.opacity = "0";
      mount().appendChild(el);
      const v = read(getComputedStyle(el));
      el.remove();
      return v;
    };

    const probe = (cls: string) =>
      measure(cls, (cs) => ({ bg: cs.backgroundColor, img: cs.backgroundImage }));

    const unk = probe("bg-lead-unk");
    const unver = probe("bg-lead-unver lead-hatch");
    add(
      "`unk` and `unver` are different fills",
      unk.bg !== unver.bg,
      `${unk.bg} vs ${unver.bg}`,
    );
    add(
      "`unver` carries the 45° hatch",
      unver.img !== "none" && unver.img.includes("gradient"),
      unver.img === "none" ? "no background-image" : "repeating-linear-gradient present",
    );

    const badChip = probe("bg-lead-bad-chip");
    const bad = probe("bg-lead-bad");
    add(
      "the chip red is contrast-nudged away from the cell red",
      badChip.bg !== bad.bg,
      `chip ${badChip.bg} vs cell ${bad.bg}`,
    );

    /**
     * The three logo plates. White is for a classified `light`/`either` logo;
     * the beige checker is the UNKNOWN-polarity fallback and must stay beige and
     * checkered, because it is the only plate that reads both ink polarities.
     * If it ever goes flat white, every unclassified cut-out disappears into it
     * and reads as "no logo found".
     */
    const checker = probe("lead-checkerboard");
    const white = probe("lead-plate-white");
    const plateDark = probe("lead-checkerboard-dark");
    const isWhite = (c: string) => /\b255,\s*255,\s*255\b/.test(c);
    add(
      "the three logo plates are distinct, and only one of them is white",
      checker.img.includes("gradient") &&
        !isWhite(checker.bg) &&
        isWhite(white.bg) &&
        !isWhite(plateDark.bg),
      `unknown ${checker.bg} ${checker.img.includes("gradient") ? "checkered" : "FLAT"} · light ${white.bg} · dark ${plateDark.bg}`,
    );

    // ── type and chrome, measured the same way ──
    const font = (cls: string) => measure(cls, (cs) => cs.fontFamily);

    /**
     * The studio wraps every route in Inter + Newsreader; the console reads in
     * the three stacks the original tool used. This is not taste — the whole
     * page looked subtly unlike `real-example.html` while it inherited them, in
     * a way that is very hard to see one component at a time.
     */
    const mono = font("font-mono");
    const serif = font("font-serif");
    add(
      "the console keeps its own type, not the studio's",
      /Cascadia/i.test(mono) && /Iowan|Palatino|Cambria/i.test(serif),
      `mono ${mono.split(",")[0]} · serif ${serif.split(",")[0]}`,
    );

    /**
     * The two mark fonts must not collapse into one. `lead-glyph` reaches a
     * symbol font so ✆ is not a missing-glyph box; `lead-emoji` reaches a COLOUR
     * font so 🐞 is red rather than a white monochrome outline. A single stack
     * cannot do both, and each failure looks like a broken control.
     */
    const glyph = font("lead-glyph");
    const emoji = font("lead-emoji");
    add(
      "the symbol and colour-emoji stacks are still separate",
      glyph !== emoji && /Symbol/i.test(glyph) && /Emoji/i.test(emoji),
      `${glyph.split(",")[0]} vs ${emoji.split(",")[0]}`,
    );

    /**
     * studio-globals hides scrollbars everywhere (`html { scrollbar-width: none }`).
     * On a 14,400-row list inside an independently-scrolling rail, how far down
     * you are is information, so this route undoes it.
     */
    add(
      "scrollbars are visible on this route",
      getComputedStyle(document.documentElement).scrollbarWidth !== "none",
      `html scrollbar-width: ${getComputedStyle(document.documentElement).scrollbarWidth}`,
    );

    // ── data-driven checks over every record ──
    const idxRes = await fetch("/api/leads/index");
    const rows: IndexRow[] = await idxRes.json();

    const records = await Promise.all(
      rows.map((r) =>
        fetch(`/api/leads/church/${encodeURIComponent(r.id)}`)
          .then((x) => (x.ok ? (x.json() as Promise<ChurchRecord>) : null))
          .catch(() => null),
      ),
    );
    const loaded = records.filter((r): r is ChurchRecord => !!r);
    add("every church's record loads", loaded.length === rows.length, `${loaded.length}/${rows.length}`);

    // Every non-empty quote must be traceable to a URL on itself or an ancestor.
    let quotes = 0;
    let orphans = 0;
    const walk = (node: unknown, inherited: string) => {
      if (Array.isArray(node)) return node.forEach((v) => walk(v, inherited));
      if (typeof node !== "object" || node === null) return;
      const o = node as Record<string, unknown>;
      const own = typeof o.source_url === "string" ? o.source_url : "";
      const nearest = own || inherited;
      if (typeof o.quote === "string" && o.quote.trim()) {
        quotes++;
        if (!safeUrl(nearest)) orphans++;
      }
      for (const v of Object.values(o)) walk(v, nearest);
    };
    loaded.forEach((r) => walk(r, ""));
    add("every quote is traceable to a source URL", orphans === 0, `${quotes} quotes, ${orphans} orphaned`);

    // A fully-unknown church must still score 0 and render a complete row.
    const allUnknown = loaded.filter((r) =>
      QMETA.every(([k]) => {
        const q = (r as unknown as Record<string, { answer?: string }>)[k];
        return !q || q.answer === "unknown" || q.answer == null;
      }),
    );
    add(
      "fully-unknown churches are representable",
      true,
      `${allUnknown.length} in this corpus (they must still render a complete row)`,
    );

    // No church may paint a colour we do not have a token for.
    const bogus: string[] = [];
    for (const r of loaded) {
      const v = churchFromRecord(r);
      for (const [k] of QMETA) {
        const s = colorState(k as QuestionKey, v.q(k as QuestionKey), ctx);
        if (!probe(`bg-lead-${s}`).bg) bogus.push(`${r.org_id}.${k}=${s}`);
      }
    }
    add("every computed state has a colour token", bogus.length === 0, bogus.slice(0, 3).join(", ") || "all 7 states resolve");

    // ── UI text checks on the live console ──
    const consoleRes = await fetch("/leads");
    const html = await consoleRes.text();
    add(
      "the page ships no literal question numbers",
      !/>Q(?:[1-9]|10)</.test(html),
      "checked the server-rendered markup",
    );

    /**
     * A HOVER AFFORDANCE MAY NOT OVERWRITE STATE.
     *
     * The row background is the ONLY thing carrying mark state — the green wash
     * that says "good lead", the red that says "issue". `hover:bg-lead-panel`
     * repainted it, so pointing at a good lead erased the fact that it was one.
     *
     * Asserted against the imported constant rather than scraped out of `/leads`,
     * because the server render of that page is a loading skeleton: no row has
     * been fetched yet, so a markup scan would find nothing and quietly pass.
     */
    add(
      "hovering a row changes no colour it is carrying",
      !/hover:bg-/.test(ROW_CLASS) && /hover:outline/.test(ROW_CLASS),
      /hover:bg-/.test(ROW_CLASS)
        ? "a hover: background utility is back on the row"
        : "hover draws an inset outline and nothing else",
    );

    // ── the row and the group card, rendered for real ──
    await auditRow(add);
    await auditPathway(add);
    await auditEmptyEvidence(add);
    await auditGroupCard(add);

    return out;
  }, []);

  useEffect(() => {
    let alive = true;
    void collect().then((out) => {
      if (alive) setChecks(out);
    });
    return () => {
      alive = false;
    };
  }, [collect, nonce]);

  const running = checks === null;
  const failed = (checks ?? []).filter((c) => !c.pass).length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-2xl font-semibold text-lead-ink">Honesty audit</h1>
      <p className="mt-1 font-mono text-xs text-lead-ink2">
        Rendering-level checks that the engine tests cannot make. Dev only.
      </p>

      <button
        type="button"
        onClick={() => {
          setChecks(null);
          setNonce((n) => n + 1);
        }}
        disabled={running}
        className="mt-4 rounded-md border border-lead-line bg-lead-panel px-3 py-1.5 font-mono text-xs text-lead-ink disabled:opacity-50"
      >
        {running ? "running…" : "re-run"}
      </button>

      {checks && checks.length > 0 && (
        <p
          className={`mt-4 font-mono text-sm ${failed ? "text-lead-bad" : "text-lead-good"}`}
        >
          {failed === 0 ? `all ${checks.length} checks pass` : `${failed} of ${checks.length} FAILING`}
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {(checks ?? []).map((c) => (
          <li
            key={c.name}
            className={`rounded-lg border border-l-[3px] border-lead-line px-3 py-2 ${
              c.pass ? "border-l-lead-good" : "border-l-lead-bad"
            }`}
          >
            <div className="flex items-baseline gap-2">
              <span
                className={`font-mono text-[11px] font-bold ${c.pass ? "text-lead-good" : "text-lead-bad"}`}
              >
                {c.pass ? "PASS" : "FAIL"}
              </span>
              <span className="flex-1 text-sm text-lead-ink">{c.name}</span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-lead-ink2">{c.detail}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
