import "server-only";

/**
 * Dev-only dataset source: read the handoff fixture off disk.
 *
 * The fixture is REAL DATA ABOUT REAL CHURCHES. It lives outside the repo tree
 * (`.gitignore` ends with `lead-console-instructions`), is never copied into
 * `public/` — which is served statically at a guessable URL that `proxy.ts` does
 * not gate — and is never deployed.
 *
 * At M5 this is replaced by the Blob source. Nothing above `dataset.ts` changes,
 * because the route handlers and the client already speak the published shape.
 */

import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { ChurchRecord, IndexRow } from "@/lib/leads/engine/types";

const DIR = process.env.LEADS_FIXTURE_DIR ?? "lead-console-instructions/fixture";

/**
 * Fail loudly rather than 404 quietly. The fixture is not in the deployment, so
 * a production build reaching this path is a misconfiguration, and a silent
 * empty console would look like "no churches matched".
 */
function assertDev() {
  if (process.env.NODE_ENV === "production" && !process.env.LEADS_FIXTURE_DIR) {
    throw new Error(
      "leads: the fixture source is dev-only. Publish the dataset to Blob (M5) " +
        "or set LEADS_FIXTURE_DIR explicitly.",
    );
  }
}

/** `org_id` is echoed into a filesystem path, so it is checked, never trusted. */
const SAFE_ID = /^[A-Za-z0-9_]+$/;

function fixturePath(...parts: string[]) {
  return resolve(process.cwd(), DIR, ...parts);
}

/**
 * FIXTURE-ONLY BACKFILL: the slogan.
 *
 * 51 of the 134 records carry `brand.slogan` and the shipped index drops every
 * one, so a row rendered from the index alone would print "no slogan found" for
 * churches whose slogan we are holding — a false negative about a real church,
 * which is the exact failure the honesty rules exist to prevent.
 *
 * A real publish MUST emit `sl`/`ss` (see `INDEX-CONTRACT.md` §5.5); when it
 * does, this merge is a no-op because the published value wins. It exists so the
 * console is truthful against today's fixture, not as a permanent shim — and it
 * is deliberately here, in the dev source, rather than in the client, so nothing
 * above `dataset.ts` learns that the fixture is special.
 *
 * Reading 134 small files once per process is fine on local disk. It would NOT
 * be fine at 14,400, which is precisely why the publisher owns this field.
 */
let sloganCache: Map<string, { sl: string; ss: string }> | null = null;

async function sloganBackfill(rows: IndexRow[]) {
  if (sloganCache) return sloganCache;
  const out = new Map<string, { sl: string; ss: string }>();
  await Promise.all(
    rows.map(async (r) => {
      const rec = await fixtureRecord(r.id);
      const brand = (rec?.brand ?? {}) as Record<string, unknown>;
      const sl = typeof brand.slogan === "string" ? brand.slogan.trim() : "";
      const ss = typeof brand.slogan_scope === "string" ? brand.slogan_scope : "";
      if (sl || ss) out.set(r.id, { sl, ss });
    }),
  );
  sloganCache = out;
  return out;
}

export async function fixtureIndex(): Promise<IndexRow[]> {
  assertDev();
  const rows = JSON.parse(await readFile(fixturePath("index.json"), "utf8")) as IndexRow[];

  // Only fill what the index did not already state. A published `sl` is the
  // source of truth; this never overwrites one.
  const missing = rows.some((r) => r.sl === undefined && r.ss === undefined);
  if (!missing) return rows;

  const fill = await sloganBackfill(rows);
  return rows.map((r) =>
    r.sl === undefined && r.ss === undefined && fill.has(r.id)
      ? { ...r, ...fill.get(r.id)! }
      : r,
  );
}

export async function fixtureRecord(orgId: string): Promise<ChurchRecord | null> {
  assertDev();
  if (!SAFE_ID.test(orgId)) return null;
  try {
    return JSON.parse(await readFile(fixturePath("records", `${orgId}.json`), "utf8"));
  } catch {
    return null;
  }
}

/**
 * A publish id derived from the index's mtime, so the client's IndexedDB cache
 * invalidates when the fixture is regenerated — the same mechanism a real
 * publish id provides, without pretending to be one.
 */
export async function fixturePublishId(): Promise<string> {
  assertDev();
  const s = await stat(fixturePath("index.json"));
  return `fixture-${Math.floor(s.mtimeMs)}`;
}

/** Logos and thumbs, content-addressed exactly as a real publish stores them. */
export async function fixtureAsset(
  kind: "logos" | "logos-thumb",
  name: string,
): Promise<Buffer | null> {
  assertDev();
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.includes("..")) return null;
  try {
    return await readFile(fixturePath(kind, name));
  } catch {
    return null;
  }
}
