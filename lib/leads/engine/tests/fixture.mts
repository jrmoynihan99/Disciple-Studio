/**
 * Loading the corpus for tests.
 *
 * Reads `data/leads/pack` through `lib/leads/pack/read.ts` — the SAME module the
 * server reads it through. That is deliberate: when the pack's shape changes,
 * both move together, and the suite cannot keep passing against a layout the app
 * no longer uses.
 *
 * The pack is REAL DATA ABOUT REAL CHURCHES — names, emails and phone numbers of
 * actual congregations. This repository is public. It is gitignored twice, never
 * copied into `public/`, and never committed; see `data/leads/README.md`.
 */

import type { ChurchRecord, IndexRow, VerdictState } from "../types.ts";
import {
  havePack,
  PACK_DIR,
  readAllRecords,
  readDevJson,
  readIndex,
} from "../../pack/read.ts";

export const FIXTURE_DIR = PACK_DIR;
export const HAVE_FIXTURE = havePack();

export function loadIndex(): IndexRow[] {
  return readIndex();
}

/**
 * MEMOIZED IN THE READER, because the corpus grew by two orders of magnitude.
 *
 * `golden.test.mts` walks every church once per assertion — projection, platform
 * line, favor, each declared divergence. At 134 records a re-read per call was
 * invisible; at 15,274 it is roughly 100,000 reads to answer 15,274 questions,
 * and the suite spends its time in the filesystem rather than in the engine it is
 * meant to be testing. `readAllRecords()` parses the 256 shards once and holds
 * them — ~300 MB, measured. Nothing in a request path calls it.
 */
export function loadRecord(orgId: string): ChurchRecord {
  const rec = readAllRecords().get(orgId);
  if (!rec) throw new Error(`no record for ${orgId} in ${PACK_DIR}`);
  return rec;
}

export function loadAllRecords(): ChurchRecord[] {
  return [...readAllRecords().values()];
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
  return readDevJson<Golden>("golden-colors.json");
}

/** The 10 fabricated edge-case records, keyed by org_id. */
export function loadEdgeCases(): Record<string, ChurchRecord> {
  const raw = readDevJson<ChurchRecord[] | Record<string, ChurchRecord>>("edge-cases.json");
  if (Array.isArray(raw)) {
    return Object.fromEntries(raw.map((r) => [r.org_id, r]));
  }
  return raw;
}
