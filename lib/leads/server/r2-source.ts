import "server-only";

/**
 * The production dataset source: read the published corpus out of Cloudflare R2.
 *
 * WHY NOT VERCEL BLOB, WHICH THIS REPLACED
 *
 * Blob's Hobby tier allows 2,000 "advanced operations" a month and `put()` is
 * one. Publishing this corpus is 14,511 objects — roughly seven times the
 * monthly budget in a single run, which suspended the store and took the demo
 * pages and export batches down with it. Pro only raises it to ~10,000, still
 * less than one publish, so no tier made it work. R2 allows 1,000,000 writes a
 * month, bills rather than suspends, and charges nothing for egress.
 *
 * TWO BUCKETS, AND THE SPLIT IS NOT COSMETIC.
 *
 * R2's public access is a BUCKET-level setting. Records carry names, emails and
 * phone numbers for 15,274 congregations; logo thumbnails are sha256-named
 * images that identify nothing on their own. Keeping them in one bucket would
 * mean that putting the logos on a CDN — the whole reason to want a custom
 * domain — would publish the contact data along with them. So they are separate
 * buckets and the data bucket can never be made public.
 *
 * WHICH PUBLISH IS LIVE IS DECIDED IN GIT, NOT IN THE STORE.
 *
 * `data/leads/published.json` is committed and imported here, so it is compiled
 * into the deployment and cannot be missing or half-written. There is no mutable
 * pointer object: data version and code version move together, and every key is
 * derived from `publish_id`, so publishing a new build cannot disturb the one a
 * running deployment is reading.
 *
 * LOGOS ARE NOT KEYED BY PUBLISH. They are content-addressed — the filename IS
 * the sha256 — so the same bytes are the same key forever. A republish uploads
 * 257 objects instead of 14,511, and a CDN URL stays valid across publishes.
 */

import { AwsClient } from "aws4fetch";
import published from "@/data/leads/published.json";
import type { ChurchRecord, IndexRow } from "@/lib/leads/engine/types";
import type { AssetKind } from "@/lib/leads/pack/read.ts";
import { shardOf } from "@/lib/leads/pack/read.ts";
import { gunzipSync } from "node:zlib";

const ENV = [
  "R2_ACCOUNT_ID",
  "R2_BUCKET_DATA",
  "R2_BUCKET_LOGOS",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
] as const;

/** `org_id` and asset names become URL path segments, so they are checked. */
const SAFE_ID = /^[A-Za-z0-9_]+$/;
const SAFE_ASSET = /^[A-Za-z0-9._-]+$/;

/**
 * Names the missing thing.
 *
 * The ways a deployment can be wrong here are "nobody set the credentials",
 * "nobody ran the publish" and "somebody published to a different account", and
 * before this they produced, respectively, a stack trace, a blank console and a
 * bare 404. All three now say which variable or which command is at fault.
 *
 * Read lazily rather than at module load: a build must not fail because the
 * build machine has no credentials, only a request that actually needs them.
 */
function env() {
  const missing = ENV.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    throw new Error(
      `leads: R2 is not configured — missing ${missing.join(", ")}. ` +
        `See data/leads/README.md.`,
    );
  }
  return {
    account: process.env.R2_ACCOUNT_ID!.trim(),
    data: process.env.R2_BUCKET_DATA!.trim(),
    logos: process.env.R2_BUCKET_LOGOS!.trim(),
    keyId: process.env.R2_ACCESS_KEY_ID!.trim(),
    secret: process.env.R2_SECRET_ACCESS_KEY!.trim(),
  };
}

let client: AwsClient | null = null;

function s3(): { r2: AwsClient; base: string; data: string; logos: string } {
  const e = env();
  // `region: "auto"` is what R2 expects; SigV4 still requires one to sign with.
  client ??= new AwsClient({
    accessKeyId: e.keyId,
    secretAccessKey: e.secret,
    service: "s3",
    region: "auto",
  });
  return {
    r2: client,
    base: `https://${e.account}.r2.cloudflarestorage.com`,
    data: e.data,
    logos: e.logos,
  };
}

function publishId(): string {
  const id = published.publish_id;
  if (!id) {
    throw new Error(
      "leads: data/leads/published.json names no publish. Run `npm run leads:publish` " +
        "against this deployment's R2 bucket and commit the file it rewrites. " +
        "See data/leads/README.md.",
    );
  }
  return id;
}

async function fetchKey(bucket: string, key: string): Promise<Buffer | null> {
  const { r2, base } = s3();
  const res = await r2.fetch(`${base}/${bucket}/${key}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`leads: R2 ${res.status} reading ${bucket}/${key}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * A missing key in the DATA bucket is a broken publish, not a missing church.
 *
 * The index and the shards are written by one script in one pass, so one being
 * absent means the deployment is pointed at a bucket that does not hold this
 * build. Returning empty there would render an empty console, which reads as "no
 * churches matched" and gets investigated as a filter bug.
 */
async function requireKey(key: string): Promise<Buffer> {
  const { data } = s3();
  const bytes = await fetchKey(data, key);
  if (!bytes) {
    throw new Error(
      `leads: ${data}/${key} is not in this R2 bucket. The deployment names publish ` +
        `${publishId()}; run \`npm run leads:publish\` against this account, or check ` +
        `R2_ACCOUNT_ID / R2_BUCKET_DATA.`,
    );
  }
  return bytes;
}

/* ------------------------------------------------------------------- the index */

/**
 * Held for the life of the instance, keyed by publish id. The index is immutable
 * under its key, so a warm invocation serves the same 2.6 MB from memory rather
 * than pulling it again.
 */
let indexGzCache: { id: string; bytes: Buffer } | null = null;

export async function r2IndexGz(): Promise<Buffer> {
  const id = publishId();
  if (indexGzCache?.id === id) return indexGzCache.bytes;
  const bytes = await requireKey(`${id}/index.json.gz`);
  indexGzCache = { id, bytes };
  return bytes;
}

let indexCache: { id: string; rows: IndexRow[] } | null = null;

export async function r2Index(): Promise<IndexRow[]> {
  const id = publishId();
  if (indexCache?.id === id) return indexCache.rows;
  const rows = JSON.parse(gunzipSync(await r2IndexGz()).toString("utf8")) as IndexRow[];
  indexCache = { id, rows };
  return rows;
}

/* -------------------------------------------------------------------- records */

/**
 * One shard is ~112 KB on the wire and ~60 churches once parsed, so the second
 * dossier opened from the same shard costs nothing. Bounded, or an instance that
 * browsed all day would end up holding the whole 194 MB corpus.
 */
const SHARD_CACHE_MAX = 24;
const shardCache = new Map<string, Map<string, ChurchRecord>>();

async function loadShard(key: string): Promise<Map<string, ChurchRecord> | null> {
  const cacheKey = `${publishId()}/${key}`;
  const hit = shardCache.get(cacheKey);
  if (hit) {
    shardCache.delete(cacheKey);
    shardCache.set(cacheKey, hit);
    return hit;
  }

  const gz = await fetchKey(s3().data, `${publishId()}/records/${key}.ndjson.gz`);
  if (!gz) return null;

  const out = new Map<string, ChurchRecord>();
  for (const line of gunzipSync(gz).toString("utf8").split("\n")) {
    if (!line) continue;
    const rec = JSON.parse(line) as ChurchRecord;
    out.set(rec.org_id, rec);
  }

  shardCache.set(cacheKey, out);
  if (shardCache.size > SHARD_CACHE_MAX) {
    shardCache.delete(shardCache.keys().next().value as string);
  }
  return out;
}

export async function r2Record(orgId: string): Promise<ChurchRecord | null> {
  if (!SAFE_ID.test(orgId)) return null;
  try {
    return (await loadShard(shardOf(orgId)))?.get(orgId) ?? null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------- assets */

/**
 * The logos bucket, and no publish id in the key — see the header. A church
 * with no logo is a real answer (`lo` absent on 846 rows), so a 404 here returns
 * null rather than throwing: unlike a missing shard it is not evidence of a
 * broken publish.
 */
export async function r2Asset(kind: AssetKind, name: string): Promise<Buffer | null> {
  if (!SAFE_ASSET.test(name) || name.includes("..")) return null;
  try {
    return await fetchKey(s3().logos, `${kind}/${name}`);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------- pointer */

export function r2PublishId(): string {
  return publishId();
}

export function r2ChurchCount(): number {
  return published.n_churches;
}
