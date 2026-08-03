/**
 * Publish `data/leads/pack` to Cloudflare R2, and rewrite `data/leads/published.json`.
 *
 *   npm run leads:publish -- --dry-run    what would upload, and how much
 *   npm run leads:publish                 do it
 *   npm run leads:publish -- --force      re-upload even what is already there
 *
 * WHAT GOES IN GIT IS THE RECEIPT, NOT THE CORPUS.
 *
 * This repository is public and the corpus is real contact data for 15,274
 * congregations, so the payload can never be committed. What is committed is
 * `published.json`, naming the build a deployment must serve. The app reads it at
 * import time and derives every key from `publish_id`, so data version and code
 * version move together and nothing in the read path is ever overwritten.
 *
 * TWO BUCKETS, BECAUSE PUBLIC ACCESS IS PER BUCKET.
 *
 *   R2_BUCKET_DATA   <publish_id>/index.json.gz, <publish_id>/records/<xx>.ndjson.gz
 *                    Records carry names, emails and phone numbers. NEVER public.
 *   R2_BUCKET_LOGOS  logos-thumb/<sha256>.webp
 *                    sha-named images that identify nothing alone. May go on a CDN.
 *
 * LOGOS ARE NOT KEYED BY PUBLISH. The filename IS the sha256, so identical bytes
 * are the same key forever: a republish uploads ~257 objects instead of 14,511,
 * and a CDN URL stays valid across publishes. The corpus's own DELTA.json
 * confirms the assumption — `logos_new_or_moved: 0` between builds.
 *
 * NOT ONE ABSOLUTE URL IS RECORDED, HERE OR IN THE RECEIPT. Keys and sha256s
 * only, so the same commit works against whichever account owns production.
 */

import { AwsClient } from "aws4fetch";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const PACK = resolve(ROOT, process.env.LEADS_PACK_DIR ?? "data/leads/pack");
const RECEIPT = resolve(ROOT, "data/leads/published.json");
const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

/** R2 allows 1M writes a month, so this is about being polite, not about a cap. */
const CONCURRENCY = 12;
const BACKOFF_MS = [1_000, 3_000, 10_000, 30_000];

interface PackPublish {
  publish_id: string;
  pack_format: number;
  built_at: string;
  packed_from: string;
  n_churches: number;
  n_shards: number;
  n_logos: number;
  index_sha256: string;
  index_bytes: number;
  shards: Record<string, string>;
}

function die(msg: string): never {
  console.error(`\nleads:publish — ${msg}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------------ preflight */

if (!existsSync(resolve(PACK, "publish.json"))) {
  die(`no pack at ${PACK}. Run \`npm run leads:pack\` first.`);
}

const ENV = [
  "R2_ACCOUNT_ID",
  "R2_BUCKET_DATA",
  "R2_BUCKET_LOGOS",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
] as const;

const missingEnv = ENV.filter((k) => !process.env[k]?.trim());
if (missingEnv.length) {
  die(
    `missing ${missingEnv.join(", ")}. They are read from .env.local. If you are ` +
      `publishing for someone else's deployment, use THEIR credentials — the ` +
      `receipt this writes is only true for the account it was published to.`,
  );
}

const ACCOUNT = process.env.R2_ACCOUNT_ID!.trim();
const BUCKET_DATA = process.env.R2_BUCKET_DATA!.trim();
const BUCKET_LOGOS = process.env.R2_BUCKET_LOGOS!.trim();
const BASE = `https://${ACCOUNT}.r2.cloudflarestorage.com`;

const r2 = new AwsClient({
  accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
  service: "s3",
  region: "auto",
});

const pack = JSON.parse(readFileSync(resolve(PACK, "publish.json"), "utf8")) as PackPublish;

/* ------------------------------------------------------ the file list, one pass */

interface Upload {
  bucket: string;
  key: string;
  file: string;
  contentType: string;
  bytes: number;
}

const uploads: Upload[] = [];

function add(bucket: string, key: string, rel: string, contentType: string) {
  const file = resolve(PACK, rel);
  if (!existsSync(file)) die(`the pack is missing ${rel}`);
  uploads.push({ bucket, key, file, contentType, bytes: readFileSync(file).length });
}

/**
 * ORDER IS LOAD-BEARING: the index and the records first, logos last.
 *
 * Workers drain this from the front. A run that dies partway therefore leaves a
 * bucket holding the small, essential half rather than 37 MB of thumbnails and
 * no church data — which is exactly what the previous provider left behind when
 * it cut us off. It also means bad credentials fail on the first object.
 */
add(BUCKET_DATA, `${pack.publish_id}/index.json.gz`, "index.json.gz", "application/gzip");

for (const f of readdirSync(resolve(PACK, "records")).sort()) {
  if (f.endsWith(".ndjson.gz")) {
    add(BUCKET_DATA, `${pack.publish_id}/records/${f}`, `records/${f}`, "application/gzip");
  }
}
for (const f of readdirSync(resolve(PACK, "logos-thumb")).sort()) {
  add(BUCKET_LOGOS, `logos-thumb/${f}`, `logos-thumb/${f}`, "image/webp");
}

/**
 * `dev/` IS NOT PUBLISHED, and this is the assertion that says so out loud.
 *
 * It holds the ten FABRICATED edge-case records. They exist to test states the
 * real corpus does not contain, they carry `_synthetic`, and they must never be
 * published, counted in a total, exported or shown to a user — a fake church in
 * a call list is a person being phoned about a congregation that does not exist.
 */
if (uploads.some((u) => u.key.includes("/dev/") || u.key.startsWith("dev/"))) {
  die("refusing to publish dev/");
}

/**
 * THE OTHER DIRECTION OF THE SAME CHECK. Records must never land in the bucket
 * that may one day be made public, and one mistyped bucket variable is all it
 * would take.
 */
for (const u of uploads) {
  const isRecord = u.key.includes("/records/") || u.key.endsWith("index.json.gz");
  if (isRecord && u.bucket !== BUCKET_DATA) {
    die(`refusing to put church data in ${u.bucket} — that bucket may be made public`);
  }
  if (u.key.startsWith("logos-thumb/") && u.bucket !== BUCKET_LOGOS) {
    die(`logos belong in ${BUCKET_LOGOS}`);
  }
}
if (BUCKET_DATA === BUCKET_LOGOS) {
  die(
    "R2_BUCKET_DATA and R2_BUCKET_LOGOS are the same bucket. Public access in R2 is " +
      "per bucket, so putting the logos on a CDN would publish every church's email " +
      "and phone number. Use two buckets.",
  );
}

const total = uploads.reduce((n, u) => n + u.bytes, 0);

/* ------------------------------------------------ what the buckets already hold */

/**
 * Listed in pages rather than probed one key at a time: a HEAD per object would
 * be ~14,500 round trips to answer a question a dozen requests can, and on a
 * re-run it would cost as much as the upload it is avoiding.
 */
async function existingKeys(bucket: string, prefix: string): Promise<Set<string>> {
  const out = new Set<string>();
  let token: string | undefined;
  do {
    const url =
      `${BASE}/${bucket}?list-type=2&max-keys=1000&prefix=${encodeURIComponent(prefix)}` +
      (token ? `&continuation-token=${encodeURIComponent(token)}` : "");
    const res = await r2.fetch(url);
    if (!res.ok) die(`R2 ${res.status} listing ${bucket} — check the credentials and bucket names`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) out.add(decodeXml(m[1]));
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? decodeXml(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1] ?? "")
      : undefined;
  } while (token);
  return out;
}

/**
 * `&amp;` LAST, or `&amp;lt;` decodes twice and comes back as `<`.
 *
 * This script runs under plain node, outside the Next module graph, so it cannot
 * import `lib/r2.ts` (which is `server-only`). The duplication is deliberate;
 * keep the two in step.
 */
function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

console.log(`leads:publish — ${PACK}\n              → ${BUCKET_DATA} + ${BUCKET_LOGOS}\n`);
console.log(`  publish_id   ${pack.publish_id}`);
console.log(`  built_at     ${pack.built_at}`);
console.log(`  churches     ${pack.n_churches.toLocaleString("en-US")}`);

const already = new Set<string>([
  ...[...(await existingKeys(BUCKET_DATA, `${pack.publish_id}/`))].map((k) => `${BUCKET_DATA}/${k}`),
  ...[...(await existingKeys(BUCKET_LOGOS, "logos-thumb/"))].map((k) => `${BUCKET_LOGOS}/${k}`),
]);

const todo = FORCE ? uploads : uploads.filter((u) => !already.has(`${u.bucket}/${u.key}`));
const todoBytes = todo.reduce((n, u) => n + u.bytes, 0);

console.log(
  `\n  in the pack  ${uploads.length.toLocaleString("en-US")} objects · ` +
    `${(total / 1048576).toFixed(1)} MB`,
);
console.log(`  already up   ${already.size.toLocaleString("en-US")}`);
console.log(
  `  to upload    ${todo.length.toLocaleString("en-US")} objects · ` +
    `${(todoBytes / 1048576).toFixed(1)} MB`,
);

if (DRY) {
  console.log(`\n  --dry-run: nothing written, published.json untouched.`);
  process.exit(0);
}

/* --------------------------------------------------------------------- upload */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let next = 0;
let done = 0;
let failed = 0;
let retried = 0;
const t0 = Date.now();

async function worker(queue: Upload[]) {
  for (;;) {
    const u = next < queue.length ? queue[next++] : undefined;
    if (!u) return;

    let sent = false;
    for (let attempt = 0; attempt <= BACKOFF_MS.length && !sent; attempt++) {
      try {
        const res = await r2.fetch(`${BASE}/${u.bucket}/${u.key}`, {
          method: "PUT",
          body: readFileSync(u.file),
          headers: {
            "Content-Type": u.contentType,
            // A publish is immutable under its key, so cache it as long as
            // anything will. This is also what a CDN in front of the logos
            // bucket reads.
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
        sent = true;
      } catch (err) {
        if (attempt < BACKOFF_MS.length) {
          retried++;
          await sleep(BACKOFF_MS[attempt]);
          continue;
        }
        failed++;
        console.error(`\n  ! ${u.bucket}/${u.key}: ${(err as Error).message}`);
        if (failed > 20) die("too many upload failures; nothing was written to published.json");
      }
    }
    done++;
    if (done % 500 === 0 || done === todo.length) {
      const rate = done / ((Date.now() - t0) / 1000);
      process.stdout.write(
        `\r  uploaded     ${done.toLocaleString("en-US")}/${todo.length.toLocaleString("en-US")}` +
          ` · ${rate.toFixed(0)}/s${retried ? ` · ${retried} retried` : ""}     `,
      );
    }
  }
}

if (todo.length) {
  console.log("");
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(todo)));
  console.log("");
}

if (failed) die(`${failed} object(s) failed to upload — published.json NOT rewritten`);

/**
 * Verify by re-listing rather than by trusting the loop.
 *
 * A receipt naming a build the bucket does not fully hold is worse than a failed
 * publish: the deployment would come up, serve an index, and 404 on whichever
 * shard happened to be missing — which reads as "that church is gone" rather
 * than as a broken publish.
 */
const afterData = await existingKeys(BUCKET_DATA, `${pack.publish_id}/`);
const afterLogos = await existingKeys(BUCKET_LOGOS, "logos-thumb/");
const have = new Set<string>([
  ...[...afterData].map((k) => `${BUCKET_DATA}/${k}`),
  ...[...afterLogos].map((k) => `${BUCKET_LOGOS}/${k}`),
]);
const stillMissing = uploads.filter((u) => !have.has(`${u.bucket}/${u.key}`));
if (stillMissing.length) {
  die(
    `${stillMissing.length} object(s) are still not in the bucket after upload, ` +
      `e.g. ${stillMissing[0].bucket}/${stillMissing[0].key}. published.json NOT rewritten.`,
  );
}

/* -------------------------------------------------------------------- receipt */

const receipt = {
  publish_id: pack.publish_id,
  pack_format: pack.pack_format,
  built_at: pack.built_at,
  n_churches: pack.n_churches,
  n_shards: pack.n_shards,
  n_logos: pack.n_logos,
  index_sha256: pack.index_sha256,
  index_bytes: pack.index_bytes,
  published_at: new Date().toISOString(),
  note:
    "Written by scripts/leads-publish.mts. Names the build this deployment serves; " +
    "every key is derived from publish_id (logos are content-addressed and shared " +
    "across publishes). Contains no church data and no account-specific URL — " +
    "see data/leads/README.md.",
};

writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);

console.log(
  `\n  verified     ${afterData.size.toLocaleString("en-US")} in ${BUCKET_DATA} · ` +
    `${afterLogos.size.toLocaleString("en-US")} in ${BUCKET_LOGOS}`,
);
console.log(`  receipt      data/leads/published.json → ${pack.publish_id}`);
console.log(`\n  Verify with:  LEADS_DATASET_SOURCE=r2 npm run dev`);
console.log(`  Then commit data/leads/published.json and deploy.`);
