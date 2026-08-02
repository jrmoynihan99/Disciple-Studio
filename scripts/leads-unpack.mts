/**
 * Unpack a lead-console data package into the fixture-shaped directory the app
 * and the tests already read.
 *
 *   npm run leads:unpack
 *
 * WHY UNPACK RATHER THAN TEACH THE APP THE PACKED FORMAT
 *
 * The package is a TRANSPORT format — four files, minified and compressed,
 * shaped so ~86 MB moves in one pass instead of 15,274 small ones. It is not a
 * runtime format: in production the bytes come out of Blob, one record per
 * dossier. Teaching `lib/leads/server/fixture.ts` a second on-disk layout would
 * add a permanent branch to serve a temporary local convenience, so the package
 * is expanded once into exactly the layout that already works and no product
 * code learns about it.
 *
 * RECORD BYTES ARE WRITTEN VERBATIM, NEVER RE-SERIALIZED.
 *
 * 3,171 of the 15,274 record lines carry Python float formatting — `38.0` where
 * `JSON.stringify` emits `38`. The values are identical; the BYTES are not, and
 * `MANIFEST.records[org_id]` is the sha256 of the bytes as shipped. Parse and
 * re-stringify a record and its sha silently changes, which costs nothing here
 * and breaks incremental republish later, because the publisher decides what to
 * upload by comparing exactly that sha. So this script splits on newlines at the
 * byte level, writes the slice untouched, and verifies the sha as it goes.
 *
 * The sha check is not decoration: it is the only thing standing between a
 * half-written package and a corpus that looks fine until one dossier is wrong.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const PKG = process.env.LEADS_PACKAGE_DIR ?? resolve(ROOT, "package-v2");
const OUT = resolve(PKG, "fixture");
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

function die(msg: string): never {
  console.error(`\nleads:unpack — ${msg}\n`);
  process.exit(1);
}

function pkgPath(...parts: string[]) {
  return resolve(PKG, ...parts);
}

function write(rel: string, bytes: Buffer | string) {
  const dest = resolve(OUT, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, bytes);
}

/* ------------------------------------------------------------------ preflight */

if (!existsSync(PKG)) {
  die(`no package at ${PKG}. Set LEADS_PACKAGE_DIR, or drop the package there.`);
}

const missing = REQUIRED.filter((f) => !existsSync(pkgPath(f)));
if (missing.length) {
  die(`${PKG} is missing: ${missing.join(", ")}`);
}

const manifest = JSON.parse(readFileSync(pkgPath("MANIFEST.json"), "utf8")) as Manifest;

/**
 * A stamp of what is already on disk, so re-running is a no-op rather than a
 * two-minute rewrite of 15,274 files. `built_at` alone would not do it — a
 * rebuild with the same inputs is byte-identical apart from that field, so the
 * church count rides along to catch a package swapped underneath the same clock.
 */
const STAMP = resolve(OUT, ".unpacked-from");
const stamp = `${manifest.built_at} ${manifest.n_churches}`;

if (!FORCE && existsSync(STAMP) && readFileSync(STAMP, "utf8") === stamp) {
  console.log(`leads:unpack — already unpacked (${stamp}). Use --force to redo.`);
  process.exit(0);
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const t0 = Date.now();
console.log(`leads:unpack — ${PKG}\n            → ${OUT}\n`);

/* ---------------------------------------------------------------------- index */

const indexBytes = gunzipSync(readFileSync(pkgPath("index.json.gz")));
const index = JSON.parse(indexBytes.toString("utf8")) as { id: string; rec?: string }[];

if (index.length !== manifest.n_churches) {
  die(`index has ${index.length} rows, MANIFEST says ${manifest.n_churches}`);
}

/**
 * BACKFILL `rec`, AND SAY SO.
 *
 * `IndexRow.rec` is the sha of the church's record, and it is the only thing
 * staleness is keyed on: `staleEntries()` compares the sha stored when a church
 * was collected against the sha now, which is how a batch says "this church's
 * data changed since you added it". v2 drops the field — every row arrives
 * without it — so left alone every comparison is `"" === ""` and the warning
 * silently never fires again. A safety notice that cannot fire is worse than
 * none, because the batch page keeps rendering as though it had checked.
 *
 * The sha is not lost, only unprojected: MANIFEST.records holds it per org_id,
 * which is the same value the publisher will key uploads on. So it is filled in
 * here rather than waiting on a rebuild — but printed, not silent, because this
 * is us patching shipped data and the next package should carry the field
 * itself.
 */
const needRec = index.filter((r) => !r.rec);
if (needRec.length) {
  let filled = 0;
  for (const row of needRec) {
    const sha = manifest.records[row.id];
    if (sha) {
      row.rec = sha;
      filled++;
    }
  }
  console.log(
    `  ! index rows had no 'rec' sha (${needRec.length}); backfilled ${filled} from MANIFEST.` +
      `\n    Staleness detection depends on it — ask upstream to project it into index.json.`,
  );
  write("index.json", JSON.stringify(index));
} else {
  write("index.json", indexBytes);
}
console.log(`  index.json          ${index.length} rows`);

/* -------------------------------------------------------------------- records */

/**
 * Split on 0x0A over the Buffer rather than over a decoded string. Decoding and
 * re-encoding would round-trip valid UTF-8 unchanged, but "would" is doing real
 * work in that sentence and the sha below is what we would be trusting it with.
 */
const ndjson = gunzipSync(readFileSync(pkgPath("records.ndjson.gz")));

let start = 0;
let written = 0;
let shaFailed = 0;
const seen = new Set<string>();

for (let i = 0; i <= ndjson.length; i++) {
  if (i !== ndjson.length && ndjson[i] !== 0x0a) continue;
  const line = ndjson.subarray(start, i);
  start = i + 1;
  if (line.length === 0) continue;

  const orgId = (JSON.parse(line.toString("utf8")) as { org_id?: string }).org_id;
  if (!orgId) die(`a record line has no org_id (byte offset ${start})`);

  const want = manifest.records[orgId];
  if (want && createHash("sha256").update(line).digest("hex") !== want) shaFailed++;

  seen.add(orgId);
  write(`records/${orgId}.json`, line);
  written++;
}

if (shaFailed) {
  die(
    `${shaFailed} record(s) do not match their MANIFEST sha256. The package is ` +
      `corrupt, or something re-serialized the bytes on the way here.`,
  );
}
if (written !== manifest.n_churches) {
  die(`wrote ${written} records, MANIFEST says ${manifest.n_churches}`);
}
const orphan = index.filter((r) => !seen.has(r.id)).length;
if (orphan) die(`${orphan} index rows have no record`);

console.log(`  records/            ${written} files · sha256 verified`);

/* ------------------------------------------------------------------ logo thumbs */

/**
 * A minimal reader for the one tar shape this package ships: flat, no
 * directories, `<sha>.webp` names far inside the 100-byte limit. Anything else —
 * a PAX or GNU long-name header, a nested path — is refused rather than guessed
 * at, because a silently skipped logo looks exactly like a church that has none,
 * and `lo` being absent is now a MEANINGFUL answer we must not counterfeit.
 */
const tar = readFileSync(pkgPath("logos-thumb.tar"));
let thumbs = 0;

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
  thumbs++;
  off += 512 + Math.ceil(size / 512) * 512;
}

console.log(`  logos-thumb/        ${thumbs} files`);

/* ------------------------------------------------------------------- dev-only */

for (const f of ["golden-colors.json", "vocab.json", "index.schema.json"]) {
  const src = pkgPath("dev-only", f);
  if (!existsSync(src)) die(`dev-only/${f} is missing — the tests read it`);
  write(f, readFileSync(src));
}
console.log(`  golden-colors.json · vocab.json · index.schema.json`);

/**
 * THE SYNTHETIC RECORDS, UNWRAPPED AND SPLIT.
 *
 * v2 ships one `{WARNING, records}` file where the old fixture had two, and its
 * `records` array carries eleven entries: the ten fabricated churches plus one
 * object that is actually the edge-case GOLDEN table, concatenated in by the
 * packager. `loadEdgeCases()` keys by `org_id`, so left alone that eleventh
 * entry becomes an edge case keyed `undefined` — a fixture that quietly grows a
 * church nobody wrote. Split them apart on the field that tells them apart, and
 * refuse to guess if the count is not the ten we expect.
 */
const edge = JSON.parse(
  readFileSync(pkgPath("dev-only", "edge-cases.SYNTHETIC.json"), "utf8"),
) as { records: Record<string, unknown>[] };

const synthetic = edge.records.filter((r) => typeof r.org_id === "string");
const strays = edge.records.filter((r) => typeof r.org_id !== "string");

if (synthetic.length !== 10) {
  die(`expected 10 synthetic records, found ${synthetic.length}`);
}
if (!synthetic.every((r) => r._synthetic)) {
  die("a synthetic record is missing its `_synthetic` flag");
}

write("edge-cases/records.json", JSON.stringify(synthetic));
for (const s of strays) {
  if (s.churches) write("edge-cases/golden-colors.json", JSON.stringify(s));
}
console.log(`  edge-cases/         ${synthetic.length} synthetic · ${strays.length} split out`);

/* ----------------------------------------------------------------------- done */

writeFileSync(STAMP, stamp);
console.log(`\n  ${((Date.now() - t0) / 1000).toFixed(1)}s · set LEADS_FIXTURE_DIR to ${OUT}`);
