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

export function loadRecord(orgId: string): ChurchRecord {
  return readJson<ChurchRecord>(`records/${orgId}.json`);
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
