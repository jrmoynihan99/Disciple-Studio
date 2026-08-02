/**
 * Loading the handoff fixture for tests.
 *
 * The fixture is REAL DATA ABOUT REAL CHURCHES — names, emails and phone numbers
 * of actual congregations. It lives outside the repo tree (`.gitignore` ends
 * with `lead-console-instructions`) and is read in place. It is never copied into
 * `public/`, never committed, and never served from an ungated path.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ChurchRecord, IndexRow, VerdictState } from "../types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../..");

export const FIXTURE_DIR =
  process.env.LEADS_FIXTURE_DIR ?? resolve(ROOT, "lead-console-instructions/fixture");

export const HAVE_FIXTURE = existsSync(resolve(FIXTURE_DIR, "index.json"));

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(resolve(FIXTURE_DIR, rel), "utf8")) as T;
}

export function loadIndex(): IndexRow[] {
  return readJson<IndexRow[]>("index.json");
}

/**
 * MEMOIZED, because the corpus grew by two orders of magnitude.
 *
 * `golden.test.mts` walks every church once per assertion — projection, platform
 * line, favor, each declared divergence — and at 134 records a re-read per call
 * was invisible. At 15,274 it is roughly 100,000 file reads to answer 15,274
 * questions, and the suite spends its time in the filesystem rather than in the
 * engine it is meant to be testing.
 *
 * Holding the whole corpus costs ~300 MB, measured. The cache is never
 * invalidated: a test run reads one immutable publish, so a record that changed
 * mid-run would be a fixture being rewritten underneath the suite, which is not
 * a case worth supporting.
 */
const recordCache = new Map<string, ChurchRecord>();

export function loadRecord(orgId: string): ChurchRecord {
  let rec = recordCache.get(orgId);
  if (!rec) {
    rec = readJson<ChurchRecord>(`records/${orgId}.json`);
    recordCache.set(orgId, rec);
  }
  return rec;
}

export function loadAllRecords(): ChurchRecord[] {
  return readdirSync(resolve(FIXTURE_DIR, "records"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<ChurchRecord>(`records/${f}`));
}

export interface GoldenChurch {
  cells: Record<string, VerdictState>;
  favorScore: number;
  favorCount: number;
  steps: number;
  platformLine: string;
}

export interface Golden {
  favorBase: number;
  favorMax: number;
  churches: Record<string, GoldenChurch>;
}

export function loadGolden(): Golden {
  return readJson<Golden>("golden-colors.json");
}

/** The 10 fabricated edge-case records, keyed by org_id. */
export function loadEdgeCases(): Record<string, ChurchRecord> {
  const raw = readJson<ChurchRecord[] | Record<string, ChurchRecord>>(
    "edge-cases/records.json",
  );
  if (Array.isArray(raw)) {
    return Object.fromEntries(raw.map((r) => [r.org_id, r]));
  }
  return raw;
}
