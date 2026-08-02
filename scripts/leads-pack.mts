/**
 * Turn an upstream data package into `data/leads/pack` — the one on-disk shape
 * the app, the tests and the publisher all read.
 *
 *   npm run leads:pack             newest build under data/leads/incoming/
 *   npm run leads:pack -- --force  repack even when the stamp matches
 *
 * WHY A PACK RATHER THAN LOOSE FILES
 *
 * The previous step expanded the package into one file per church: 15,274
 * records and 14,254 thumbnails, 250 MB across ~29,500 files. That works on a
 * laptop and cannot ship — Vercel's serverless bundle stops at 250 MB — and it
 * made the local layout something production could never be. This produces the
 * SAME bytes in a form that deploys: the index stays gzipped and is served
 * without ever being parsed server-side, and records are gathered into 256
 * shards keyed by `sha256(org_id)[0:2]`, so opening a dossier reads ~112 KB
 * instead of the publisher uploading 15,274 objects.
 *
 * RECORD BYTES ARE COPIED VERBATIM, NEVER RE-SERIALIZED.
 *
 * 3,171 of the record lines carry Python float formatting — `38.0` where
 * `JSON.stringify` emits `38`. The values are identical; the BYTES are not, and
 * `MANIFEST.records[org_id]` is the sha256 of the bytes as shipped. Parse and
 * re-stringify a record and its sha silently changes, which costs nothing here
 * and breaks incremental republish later, because the publisher decides what to
 * upload by comparing exactly that sha. So this script splits on newlines at the
 * byte level, concatenates the slices untouched, and verifies each sha as it
 * goes. That check is the only thing standing between a half-written package and
 * a corpus that looks fine until one dossier is wrong.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

/**
 * Bumped when the pack's on-disk shape changes. It rides into `publish_id`, so a
 * reshaped pack gets fresh Blob keys instead of writing new bytes under keys a
 * running deployment is already reading.
 */
const PACK_FORMAT = 1;

/** Shards are ndjson, so the separator is a byte, not a string join. */
const NEWLINE = Buffer.from([0x0a]);

const INCOMING = resolve(ROOT, "data/leads/incoming");
const OUT = process.env.LEADS_PACK_DIR
  ? resolve(ROOT, process.env.LEADS_PACK_DIR)
  : resolve(ROOT, "data/leads/pack");
const FORCE = process.argv.includes("--force");

/** A file the package must contain. Missing one is a hard error, never a skip. */
const REQUIRED = [
  "MANIFEST.json",
  "index.json.gz",
  "records.ndjson.gz",
  "logos-thumb.tar",
] as const;

interface Manifest {
  n_churches: number;
  built_at: string;
  records: Record<string, string>;
  logos: Record<string, { sha: string; ext: string }>;
}

interface IndexRowish {
  id: string;
  rec?: string;
  sl?: string;
  ss?: string;
}

function die(msg: string): never {
  console.error(`\nleads:pack — ${msg}\n`);
  process.exit(1);
}

function sha256(b: Buffer | string): string {
  return createHash("sha256").update(b).digest("hex");
}

function write(rel: string, bytes: Buffer | string) {
  const dest = resolve(OUT, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, bytes);
}

/* ------------------------------------------------------------------ preflight */

/**
 * Newest build wins, but the choice is PRINTED. Several packages sit side by side
 * during a handover and silently packing yesterday's is the kind of mistake that
 * only shows up as a church whose dossier disagrees with its row.
 */
function newestIncoming(): string {
  if (process.env.LEADS_PACKAGE_DIR) return resolve(ROOT, process.env.LEADS_PACKAGE_DIR);
  if (!existsSync(INCOMING)) die(`no ${INCOMING}. Drop the package there, or set LEADS_PACKAGE_DIR.`);

  /**
   * A PACKAGE IS WHATEVER FOLDER HAS A `MANIFEST.json`, whatever it is called.
   *
   * The name carries no meaning — `package-v2-final`, `disciple-studio-leads-package`,
   * a date, all fine — so several drops can sit side by side and the newest wins.
   * The choice is PRINTED, because silently packing yesterday's build only shows
   * up later as a church whose dossier disagrees with its row.
   *
   * Two depths, and one special case, because all three are things a human
   * unzipping an archive on Windows actually produces:
   *
   *   incoming/MANIFEST.json                    ← extracted with no folder at all
   *   incoming/<name>/MANIFEST.json             ← the normal case
   *   incoming/<name>/<name>/MANIFEST.json      ← "extract here" twice over
   *
   * Guessing at a fourth level would start finding things that are not packages;
   * two is where a mistake stops being a mistake and starts being a different
   * layout, and the error below says what was actually there so it can be fixed.
   */
  const candidates: string[] = [];
  if (existsSync(resolve(INCOMING, "MANIFEST.json"))) candidates.push(INCOMING);

  const dirs = (at: string) => {
    try {
      return readdirSync(at, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => resolve(at, d.name));
    } catch {
      return [];
    }
  };

  for (const first of dirs(INCOMING)) {
    if (existsSync(resolve(first, "MANIFEST.json"))) candidates.push(first);
    else {
      for (const second of dirs(first)) {
        if (existsSync(resolve(second, "MANIFEST.json"))) candidates.push(second);
      }
    }
  }

  if (!candidates.length) {
    const saw = dirs(INCOMING).map((d) => `    ${d.slice(INCOMING.length + 1)}/`);
    die(
      `no package under ${INCOMING}.\n  A package is any folder containing MANIFEST.json.` +
        (saw.length ? `\n  Found these folders, none with one:\n${saw.join("\n")}` : "") +
        `\n  Extract the archive there, or set LEADS_PACKAGE_DIR.`,
    );
  }

  return candidates.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

const PKG = newestIncoming();
const pkgPath = (...parts: string[]) => resolve(PKG, ...parts);

if (!existsSync(PKG)) die(`no package at ${PKG}`);

const missing = REQUIRED.filter((f) => !existsSync(pkgPath(f)));
if (missing.length) die(`${PKG} is missing: ${missing.join(", ")}`);

const manifest = JSON.parse(readFileSync(pkgPath("MANIFEST.json"), "utf8")) as Manifest;

/**
 * `publish_id` is a function of the SOURCE PACKAGE, never of this machine.
 *
 * The previous scheme hashed the unpacked index's mtime, which git does not
 * preserve and every checkout re-mints — two people packing the same package got
 * two ids, and every deploy invalidated every client's cached index for no
 * reason. This is derived from what upstream built: the build clock, the church
 * count, and the per-record shas. Same package in, same id out, on any machine.
 */
const publishId = `p${PACK_FORMAT}-${sha256(
  [
    String(PACK_FORMAT),
    manifest.built_at,
    String(manifest.n_churches),
    ...Object.keys(manifest.records)
      .sort()
      .map((k) => `${k}:${manifest.records[k]}`),
  ].join("\n"),
).slice(0, 16)}`;

const STAMP = resolve(OUT, ".packed-from");

if (!FORCE && existsSync(STAMP) && readFileSync(STAMP, "utf8") === publishId) {
  console.log(`leads:pack — already packed (${publishId}). Use --force to redo.`);
  process.exit(0);
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const t0 = Date.now();
console.log(`leads:pack — ${PKG}\n           → ${OUT}\n           publish_id ${publishId}\n`);

/* ---------------------------------------------------------------------- index */

const index = JSON.parse(
  gunzipSync(readFileSync(pkgPath("index.json.gz"))).toString("utf8"),
) as IndexRowish[];

if (index.length !== manifest.n_churches) {
  die(`index has ${index.length} rows, MANIFEST says ${manifest.n_churches}`);
}

const rowById = new Map(index.map((r) => [r.id, r]));

/**
 * BACKFILL `rec`, AND SAY SO.
 *
 * `IndexRow.rec` is the sha of the church's record, and staleness is keyed on it
 * alone: `staleEntries()` compares the sha stored when a church was collected
 * against the sha now, which is how a batch says "this church's data changed
 * since you added it". The package drops the field — every row arrives without
 * it — so left alone every comparison is `"" === ""` and the warning silently
 * never fires again. A safety notice that cannot fire is worse than none,
 * because the batch page keeps rendering as though it had checked.
 *
 * The sha is not lost, only unprojected: `MANIFEST.records` holds it per org_id,
 * which is the same value the publisher keys uploads on. So it is filled in here
 * rather than waiting on a rebuild — but printed, not silent, because this is us
 * patching shipped data and the next package should carry the field itself.
 */
let recFilled = 0;
for (const row of index) {
  if (row.rec) continue;
  const sha = manifest.records[row.id];
  if (sha) {
    row.rec = sha;
    recFilled++;
  }
}

/* -------------------------------------------------------------------- records */

/**
 * Split on 0x0A over the Buffer rather than over a decoded string. Decoding and
 * re-encoding would round-trip valid UTF-8 unchanged, but "would" is doing real
 * work in that sentence and the sha below is what we would be trusting it with.
 */
const ndjson = gunzipSync(readFileSync(pkgPath("records.ndjson.gz")));

const shards = new Map<string, Buffer[]>();
let start = 0;
let seenCount = 0;
let shaFailed = 0;
let sloganFilled = 0;
const seen = new Set<string>();

for (let i = 0; i <= ndjson.length; i++) {
  if (i !== ndjson.length && ndjson[i] !== 0x0a) continue;
  const line = ndjson.subarray(start, i);
  start = i + 1;
  if (line.length === 0) continue;

  const rec = JSON.parse(line.toString("utf8")) as {
    org_id?: string;
    brand?: { slogan?: unknown; slogan_scope?: unknown };
  };
  const orgId = rec.org_id;
  if (!orgId) die(`a record line has no org_id (byte offset ${start})`);
  if (seen.has(orgId)) die(`${orgId} appears twice in records.ndjson`);

  const want = manifest.records[orgId];
  if (want && sha256(line) !== want) shaFailed++;

  /**
   * PROJECT THE SLOGAN INTO THE INDEX.
   *
   * The published index drops `brand.slogan`, so a row rendered from the index
   * alone printed "no slogan found" for churches whose slogan we hold — a false
   * negative about a real church, which is the failure the honesty rules exist
   * to prevent. The old fix read all 15,274 records on the first index request
   * to patch it back. That is 194 MB per cold start, which is survivable on a
   * laptop and fatal in a serverless function. Here the records are already
   * streaming past, so it costs nothing and happens once per pack.
   */
  const row = rowById.get(orgId);
  if (row) {
    const brand = rec.brand ?? {};
    const sl = typeof brand.slogan === "string" ? brand.slogan.trim() : "";
    const ss = typeof brand.slogan_scope === "string" ? brand.slogan_scope : "";
    if (sl || ss) {
      if (row.sl === undefined) row.sl = sl;
      if (row.ss === undefined) row.ss = ss;
      sloganFilled++;
    }
  }

  const key = shardOf(orgId);
  const bucket = shards.get(key);
  if (bucket) bucket.push(line, NEWLINE);
  else shards.set(key, [line, NEWLINE]);

  seen.add(orgId);
  seenCount++;
}

if (shaFailed) {
  die(
    `${shaFailed} record(s) do not match their MANIFEST sha256. The package is ` +
      `corrupt, or something re-serialized the bytes on the way here.`,
  );
}
if (seenCount !== manifest.n_churches) {
  die(`read ${seenCount} records, MANIFEST says ${manifest.n_churches}`);
}
const orphan = index.filter((r) => !seen.has(r.id)).length;
if (orphan) die(`${orphan} index rows have no record`);

const shardShas: Record<string, string> = {};
let shardBytes = 0;
for (const [key, parts] of [...shards].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  const gz = gzipSync(Buffer.concat(parts), { level: 9 });
  write(`records/${key}.ndjson.gz`, gz);
  shardShas[key] = sha256(gz);
  shardBytes += gz.length;
}

console.log(
  `  records/            ${seenCount} records · ${shards.size} shards · ` +
    `${(shardBytes / 1048576).toFixed(1)} MB · sha256 verified`,
);

/* -------------------------------------------------------- index, once patched */

const indexGz = gzipSync(Buffer.from(JSON.stringify(index), "utf8"), { level: 9 });
write("index.json.gz", indexGz);

console.log(
  `  index.json.gz       ${index.length} rows · ${(indexGz.length / 1048576).toFixed(1)} MB`,
);
if (recFilled) {
  console.log(
    `  ! ${recFilled} rows had no 'rec' sha; backfilled from MANIFEST.` +
      `\n    Staleness detection depends on it — ask upstream to project it into index.json.`,
  );
}
console.log(`  ! ${sloganFilled} rows had their slogan projected in from the record.`);

/* --------------------------------------------------------------- logo thumbs */

/**
 * A minimal reader for the one tar shape this package ships: flat, no
 * directories, `<sha>.webp` names far inside the 100-byte limit. Anything else —
 * a PAX or GNU long-name header, a nested path — is refused rather than guessed
 * at, because a silently skipped logo looks exactly like a church that has none,
 * and `lo` being absent is a MEANINGFUL answer we must not counterfeit.
 */
const tar = readFileSync(pkgPath("logos-thumb.tar"));
const logoNames: string[] = [];

for (let off = 0; off + 512 <= tar.length; ) {
  const header = tar.subarray(off, off + 512);
  const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
  if (!name) break; // two zero blocks end the archive

  const type = String.fromCharCode(header[156]);
  if (type !== "0" && type !== "\0") {
    die(`logos-thumb.tar entry ${name} has unsupported type '${type}'`);
  }
  if (name.includes("/") || name.includes("..")) {
    die(`logos-thumb.tar is not flat: ${name}`);
  }

  const size = parseInt(header.subarray(124, 136).toString("utf8").replace(/\0.*$/, "").trim(), 8);
  if (!Number.isFinite(size)) die(`logos-thumb.tar entry ${name} has an unreadable size`);

  write(`logos-thumb/${name}`, tar.subarray(off + 512, off + 512 + size));
  logoNames.push(name);
  off += 512 + Math.ceil(size / 512) * 512;
}

console.log(`  logos-thumb/        ${logoNames.length} files`);

/* ------------------------------------------------------------------- dev-only */

for (const f of ["golden-colors.json", "vocab.json", "index.schema.json"]) {
  const src = pkgPath("dev-only", f);
  if (!existsSync(src)) die(`dev-only/${f} is missing — the tests read it`);
  write(`dev/${f}`, readFileSync(src));
}

/**
 * THE SYNTHETIC RECORDS, UNWRAPPED AND SPLIT.
 *
 * The package ships one `{WARNING, records}` file where the old fixture had two,
 * and its `records` array carries eleven entries: the ten fabricated churches
 * plus one object that is actually the edge-case GOLDEN table, concatenated in
 * by the packager. `loadEdgeCases()` keys by `org_id`, so left alone that
 * eleventh entry becomes an edge case keyed `undefined` — a fixture that quietly
 * grows a church nobody wrote. Split them apart on the field that tells them
 * apart, and refuse to guess if the count is not the ten we expect.
 *
 * These are FABRICATED and must never be published, counted or shown. They stay
 * under `dev/`, which the publisher does not read.
 */
const edge = JSON.parse(
  readFileSync(pkgPath("dev-only", "edge-cases.SYNTHETIC.json"), "utf8"),
) as { records: Record<string, unknown>[] };

const synthetic = edge.records.filter((r) => typeof r.org_id === "string");
const strays = edge.records.filter((r) => typeof r.org_id !== "string");

if (synthetic.length !== 10) die(`expected 10 synthetic records, found ${synthetic.length}`);
if (!synthetic.every((r) => r._synthetic)) die("a synthetic record is missing its `_synthetic` flag");

write("dev/edge-cases.json", JSON.stringify(synthetic));
for (const s of strays) if (s.churches) write("dev/edge-cases-golden.json", JSON.stringify(s));

console.log(
  `  dev/                golden-colors · vocab · index.schema · ` +
    `${synthetic.length} synthetic (${strays.length} split out)`,
);

/* ---------------------------------------------------------------- publish.json */

const publish = {
  publish_id: publishId,
  pack_format: PACK_FORMAT,
  built_at: manifest.built_at,
  packed_from: PKG.slice(ROOT.length + 1).replace(/\\/g, "/"),
  n_churches: manifest.n_churches,
  n_shards: shards.size,
  n_logos: logoNames.length,
  index_sha256: sha256(indexGz),
  index_bytes: indexGz.length,
  shards: shardShas,
};

write("publish.json", JSON.stringify(publish, null, 2));
writeFileSync(STAMP, publishId);

console.log(`\n  ${((Date.now() - t0) / 1000).toFixed(1)}s · ${publishId}`);

/* --------------------------------------------------------------------- helpers */

/**
 * The shard a record lives in. Hashed rather than sliced off the org_id itself,
 * because org_ids are church domains and cluster hard — `first`, `firstbaptist`,
 * `fbc*` would pile into a handful of shards while most stayed near-empty. 256
 * shards of ~60 records each keeps a dossier read at ~112 KB.
 */
function shardOf(orgId: string): string {
  return sha256(orgId).slice(0, 2);
}
