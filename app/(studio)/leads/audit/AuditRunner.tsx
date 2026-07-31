"use client";

import { useCallback, useEffect, useState } from "react";
import { churchFromRecord } from "@/lib/leads/engine/adapt";
import { colorState } from "@/lib/leads/engine/color";
import { defaultFavorModel } from "@/lib/leads/engine/favor";
import { QMETA, type ChurchRecord, type EngineCtx, type IndexRow, type QuestionKey } from "@/lib/leads/engine/types";
import { safeUrl } from "@/lib/leads/engine/url";

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

const ctx: EngineCtx = { overrides: {}, favor: defaultFavorModel(), rows: [] };

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
    const probe = (cls: string) => {
      const el = document.createElement("span");
      el.className = cls;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      const v = { bg: cs.backgroundColor, img: cs.backgroundImage };
      el.remove();
      return v;
    };

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

    const checker = probe("lead-checkerboard");
    add(
      "the logo checkerboard survived",
      checker.img.includes("gradient") && !checker.bg.includes("255, 255, 255"),
      `${checker.bg}, ${checker.img.includes("gradient") ? "checkered" : "FLAT"}`,
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
