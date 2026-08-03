/**
 * Reading `data/leads/pack` — the local corpus.
 *
 * THE FILE THE APP AND THE TESTS BOTH IMPORT. That is the point of it: the pack's
 * shape is described once, so a change to sharding or naming cannot move under
 * the app while the suite keeps passing against the old layout. `scripts/
 * leads-pack.mts` writes what this reads; `scripts/leads-publish.mts` uploads it
 * unchanged.
 *
 * THE PACK IS REAL DATA ABOUT REAL CHURCHES — names, emails and phone numbers of
 * actual congregations. This repository is public, so it is gitignored twice
 * (root, and an allow-list in `data/leads/.gitignore`), never copied into
 * `public/` — which is served statically at a guessable URL that `proxy.ts` does
 * not gate — and never committed.
 *
 * Deliberately synchronous, and deliberately free of `server-only`. The tests are
 * synchronous and import it directly; the server wraps it in `pack-source.ts`.
 * Sync I/O in a request handler would be a real objection if this were the
 * production path, and it is not — production reads Blob (`blob-source.ts`).
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import type { ChurchRecord, IndexRow } from "../engine/types.ts";

export const PACK_DIR = resolve(process.cwd(), process.env.LEADS_PACK_DIR ?? "data/leads/pack");

export interface PackPublish {
  publish_id: string;
  pack_format: number;
  built_at: string;
  packed_from: string;
  n_churches: number;
  n_shards: number;
  n_logos: number;
  index_sha256: string;
  index_bytes: number;
  /** shard key → sha256 of the gzipped shard, the unit the publisher uploads. */
  shards: Record<string, string>;
}

export type AssetKind = "logos" | "logos-thumb";

export function packPath(...parts: string[]): string {
  return resolve(PACK_DIR, ...parts);
}

export function havePack(): boolean {
  return existsSync(packPath("publish.json"));
}

/**
 * The shard a record lives in. Must stay identical to `scripts/leads-pack.mts` —
 * they are the same rule written twice, on purpose: the script may not import
 * app code, and a reader that disagreed would return `null` for a church that is
 * present, which reads as "no such church" rather than as a bug.
 */
export function shardOf(orgId: string): string {
  return createHash("sha256").update(orgId).digest("hex").slice(0, 2);
}

/** `org_id` is echoed into a filesystem path, so it is checked, never trusted. */
const SAFE_ID = /^[A-Za-z0-9_]+$/;
const SAFE_ASSET = /^[A-Za-z0-9._-]+$/;

let publishCache: PackPublish | null = null;

export function readPublish(): PackPublish {
  if (!publishCache) {
    publishCache = JSON.parse(readFileSync(packPath("publish.json"), "utf8")) as PackPublish;
  }
  return publishCache;
}

let indexGzCache: Buffer | null = null;

/** The gzip bytes, unparsed — what the index route streams to the browser. */
export function readIndexGz(): Buffer {
  if (!indexGzCache) indexGzCache = readFileSync(packPath("index.json.gz"));
  return indexGzCache;
}

let indexCache: IndexRow[] | null = null;

export function readIndex(): IndexRow[] {
  if (!indexCache) {
    indexCache = JSON.parse(gunzipSync(readIndexGz()).toString("utf8")) as IndexRow[];
  }
  return indexCache;
}

/**
 * Parsed shards, most-recently-used last.
 *
 * A dossier open costs one 112 KB read and one ~0.76 MB parse, then nothing for
 * the other ~59 churches in that shard. The cap is what keeps a long browsing
 * session from ending up holding all 194 MB: 24 shards is ~18 MB, which covers
 * far more than anyone opens in a sitting.
 */
const SHARD_CACHE_MAX = 24;
const shardCache = new Map<string, Map<string, ChurchRecord>>();

function readShard(key: string): Map<string, ChurchRecord> | null {
  const hit = shardCache.get(key);
  if (hit) {
    shardCache.delete(key);
    shardCache.set(key, hit);
    return hit;
  }

  let bytes: Buffer;
  try {
    bytes = gunzipSync(readFileSync(packPath("records", `${key}.ndjson.gz`)));
  } catch {
    return null;
  }

  const out = new Map<string, ChurchRecord>();
  for (const line of bytes.toString("utf8").split("\n")) {
    if (!line) continue;
    const rec = JSON.parse(line) as ChurchRecord;
    out.set(rec.org_id, rec);
  }

  shardCache.set(key, out);
  if (shardCache.size > SHARD_CACHE_MAX) {
    shardCache.delete(shardCache.keys().next().value as string);
  }
  return out;
}

export function readRecord(orgId: string): ChurchRecord | null {
  if (!SAFE_ID.test(orgId)) return null;
  return readShard(shardOf(orgId))?.get(orgId) ?? null;
}

let allCache: Map<string, ChurchRecord> | null = null;

/**
 * Every record, parsed once.
 *
 * For the suite and the offline scripts, which sweep the whole corpus several
 * times over — `golden.test.mts` alone walks every church once per assertion.
 * Going through `readRecord` would thrash the bounded cache, because the shard
 * key is a hash and consecutive org_ids land in unrelated shards. Holding the
 * corpus costs ~300 MB, measured; nothing in a request path calls this.
 */
export function readAllRecords(): Map<string, ChurchRecord> {
  if (allCache) return allCache;
  const out = new Map<string, ChurchRecord>();
  for (const f of readdirSync(packPath("records"))) {
    if (!f.endsWith(".ndjson.gz")) continue;
    const bytes = gunzipSync(readFileSync(packPath("records", f)));
    for (const line of bytes.toString("utf8").split("\n")) {
      if (!line) continue;
      const rec = JSON.parse(line) as ChurchRecord;
      out.set(rec.org_id, rec);
    }
  }
  allCache = out;
  return out;
}

/** Logos and thumbs, content-addressed exactly as a publish stores them. */
export function readAsset(kind: AssetKind, name: string): Buffer | null {
  if (!SAFE_ASSET.test(name) || name.includes("..")) return null;
  try {
    return readFileSync(packPath(kind, name));
  } catch {
    return null;
  }
}

/** `dev/` holds the golden table, the vocabulary and the fabricated edge cases.
 *  Test-only by construction — the publisher does not read this folder. */
export function readDevJson<T>(name: string): T {
  return JSON.parse(readFileSync(packPath("dev", name), "utf8")) as T;
}
