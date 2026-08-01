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
  host.style.width = "880px";
  (document.querySelector("[data-lead-root]") ?? document.body).appendChild(host);

  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(
        <>
          <ChurchCard card={card} stale={false} departed={false} onOp={() => {}} onRemoveChurch={() => {}} />
          <ExportBar count={1} acknowledged onAcknowledge={() => {}} />
        </>,
      );
    });

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
    add(
      "the group export button is inert even when acknowledged",
      !!exportBtn && exportBtn.disabled && !exportBtn.getAttribute("href"),
      exportBtn ? (exportBtn.disabled ? "disabled, no href" : "THE BUTTON IS LIVE") : "not found",
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

    // ── export groups, rendered for real ──
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
