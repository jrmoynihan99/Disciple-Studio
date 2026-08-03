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
const PACK_FORMAT = 2;

/** Shards are ndjson, so the separator is a byte, not a string join. */
const NEWLINE = Buffer.from([0x0a]);

const INCOMING = resolve(ROOT, "data/leads/incoming");
const OUT = process.env.LEADS_PACK_DIR
  ? resolve(ROOT, process.env.LEADS_PACK_DIR)
  : resolve(ROOT, "data/leads/pack");
const FORCE = process.argv.includes("--force");

/**
 * A file the package must contain. Missing one is a hard error, never a skip.
 *
 * `logos-alt.tar` IS REQUIRED, not optional, and that is the whole reason this
 * list exists. Nothing here checks for UNEXPECTED files — several are ignored on
 * purpose (`DELTA.json`, `changed.ndjson.gz`) — so a package that simply lacked
 * the alternates would have packed clean, reported success, and produced a
 * console where every church silently has exactly one logo option. This file's
 * doctrine is that a silently skipped logo is indistinguishable from a church
 * that has none; the same argument applies a level up, to the archive.
 */
const REQUIRED = [
  "MANIFEST.json",
  "index.json.gz",
  "records.ndjson.gz",
  "logos-thumb.tar",
  "logos-alt.tar",
] as const;

interface Manifest {
  n_churches: number;
  built_at: string;
  records: Record<string, string>;
  logos: Record<string, { sha: string; ext: string }>;
  /**
   * Runner-up logos, keyed by org_id, under a `churches` map beside a `_README`.
   *
   * SHAS AND NOTHING ELSE. This map used to carry the whole objects; upstream cut
   * it back to the bare shas when the palettes landed, because a second copy of
   * every alternative took MANIFEST.json to 34 MB. Everything else about an
   * alternative — kind, theme, dimensions, url, its own colour ramp — lives on
   * the record, once. What is here is what a publisher needs: which archive
   * members belong to which church.
   */
  logo_alts?: { churches?: Record<string, string[]> };
}

interface IndexRowish {
  id: string;
  rec?: string;
  sl?: string;
  ss?: string;
  /** How many runner-up logos this church has — the length of `logo_alts`. */
  la?: number;
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
/**
 * The runner-up logo shas each church offers, harvested while the records stream
 * past. Checked against the index, the MANIFEST and the unpacked files once the
 * archives are open — see "the alternates line up" below. Collected here because
 * the line is already parsed; a second pass over 15,273 records to read one array
 * would be the expensive way to ask the same question.
 */
const altShasByOrg = new Map<string, string[]>();

/**
 * THE COLOURS MUST BELONG TO THE PICTURE THEY WERE MEASURED FROM.
 *
 * A reviewer switches a church's logo and the demo is repainted in that logo's
 * ramp. The join that makes that possible is `logo_alts[i].palette.palette_sha8
 * === logo_alts[i].sha8` — a sha1 prefix, deliberately NOT the sha256 that keys
 * the archives, because the two hashes are computed by different tools. Upstream
 * asserts it on their side; nothing here did, and this is the failure it catches:
 * a palette attached to a logo it was not measured from renders perfectly and
 * renders wrong, on a page a church receives.
 *
 * Collected as first offenders rather than counted, because the useful thing on
 * a mismatch is which church to go and look at.
 */
const paletteBad: string[] = [];
const rampMissing: string[] = [];

for (let i = 0; i <= ndjson.length; i++) {
  if (i !== ndjson.length && ndjson[i] !== 0x0a) continue;
  const line = ndjson.subarray(start, i);
  start = i + 1;
  if (line.length === 0) continue;

  const rec = JSON.parse(line.toString("utf8")) as {
    org_id?: string;
    brand?: { slogan?: unknown; slogan_scope?: unknown; logo_sha8?: unknown };
    logo_palette?: Record<string, unknown>;
    logo_alts?: { sha?: unknown; sha8?: unknown; palette?: Record<string, unknown> }[];
  };
  const orgId = rec.org_id;
  if (!orgId) die(`a record line has no org_id (byte offset ${start})`);
  if (seen.has(orgId)) die(`${orgId} appears twice in records.ndjson`);

  /**
   * The pick's own palette is joined the same way, against `brand.logo_sha8`.
   * Checked even though nothing switches it: it is the ramp 15,273 demos are
   * painted with today, and it is one equality.
   */
  const pickPalette = rec.logo_palette;
  const pickSha8 = rec.brand?.logo_sha8;
  if (pickPalette?.palette_sha8 && pickSha8 && pickPalette.palette_sha8 !== pickSha8) {
    if (paletteBad.length < 5) {
      paletteBad.push(`${orgId} pick: measured ${pickPalette.palette_sha8}, shipping ${pickSha8}`);
    }
  }

  if (Array.isArray(rec.logo_alts) && rec.logo_alts.length) {
    altShasByOrg.set(
      orgId,
      rec.logo_alts.map((a) => (typeof a?.sha === "string" ? a.sha : "")),
    );
    for (const a of rec.logo_alts) {
      const p = a?.palette;
      if (!p || !a.sha8 || p.palette_sha8 !== a.sha8) {
        if (paletteBad.length < 5) {
          paletteBad.push(
            `${orgId} alt ${String(a?.sha).slice(0, 8)}: measured ${
              String(p?.palette_sha8 ?? "(no palette)")
            }, shipping ${String(a?.sha8 ?? "(no sha8)")}`,
          );
        }
      } else if (!p.theme_light && !p.theme_dark) {
        // Every one of the 19,803 carries both ramps, including the 6,740 with no
        // colour in the mark — "greyscale" costs the accent, not the ramp. An
        // alternative with neither would export a demo in the studio's default
        // clay while the card promised the church's own colours.
        if (rampMissing.length < 5) rampMissing.push(`${orgId} -> ${String(a.sha).slice(0, 8)}`);
      }
    }
  }

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
 * ONE DIRECTORY FOR BOTH ARCHIVES, AND THE DATA FORCES IT.
 *
 * The package ships two tars: `logos-thumb.tar` (the logo we picked for each
 * church) and `logos-alt.tar` (the runner-ups a reviewer may switch to). They are
 * DISJOINT — an alternate whose sha is already in the thumbs archive, because it
 * is some other church's pick, is omitted from the alternates archive rather than
 * duplicated. Measured on this build: 14,253 + 19,118 members, overlap exactly 0.
 *
 * So a `logo_alts[].sha` can live in EITHER archive, and nothing downstream can
 * tell which from the sha alone. Splitting them into two prefixes would mean
 * every alternate costs a failed R2 GET before the successful one, and would put
 * a second prefix through `leads-publish.mts` — which lists existing keys by
 * prefix in two separate places, and re-uploads everything it cannot see.
 *
 * Unpacking both into `logos-thumb/` makes a sha resolve to exactly one file, for
 * free, with no change to the publisher, the asset route or any caller. The cost
 * is the name: this prefix now means "every 108px thumb we hold", picks and
 * runner-ups alike. Renaming it would orphan 14,253 objects already live in R2.
 */
function unpackTar(file: string, into: string): string[] {
  /**
   * A minimal reader for the one tar shape this package ships: flat, no
   * directories, `<sha>.webp` names far inside the 100-byte limit. Anything else —
   * a PAX or GNU long-name header, a nested path — is refused rather than guessed
   * at, because a silently skipped logo looks exactly like a church that has none,
   * and `lo` being absent is a MEANINGFUL answer we must not counterfeit.
   */
  const tar = readFileSync(pkgPath(file));
  const names: string[] = [];

  for (let off = 0; off + 512 <= tar.length; ) {
    const header = tar.subarray(off, off + 512);
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    if (!name) break; // two zero blocks end the archive

    const type = String.fromCharCode(header[156]);
    if (type !== "0" && type !== "\0") {
      die(`${file} entry ${name} has unsupported type '${type}'`);
    }
    if (name.includes("/") || name.includes("..")) {
      die(`${file} is not flat: ${name}`);
    }

    const size = parseInt(header.subarray(124, 136).toString("utf8").replace(/\0.*$/, "").trim(), 8);
    if (!Number.isFinite(size)) die(`${file} entry ${name} has an unreadable size`);

    write(`${into}/${name}`, tar.subarray(off + 512, off + 512 + size));
    names.push(name);
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return names;
}

const pickNames = unpackTar("logos-thumb.tar", "logos-thumb");
const altNames = unpackTar("logos-alt.tar", "logos-thumb");

/**
 * The disjointness is ASSERTED, not assumed. If upstream ever starts repeating a
 * sha across the two archives the second write would silently win — identical
 * bytes under a content-addressed name, so harmless in fact, but it would mean
 * the counts printed below and in `publish.json` no longer describe the files on
 * disk, and `n_logos` is what the publisher's "did everything land" check reads.
 */
const overlap = pickNames.filter((n) => new Set(altNames).has(n));
if (overlap.length) {
  die(
    `the two logo archives share ${overlap.length} entries (e.g. ${overlap[0]}).\n` +
      `  They are meant to be disjoint — an alternate already in logos-thumb.tar is omitted from logos-alt.tar.`,
  );
}

const logoNames = [...pickNames, ...altNames];

console.log(
  `  logos-thumb/        ${logoNames.length} files ` +
    `(${pickNames.length} picks · ${altNames.length} alternates)`,
);

/* ------------------------------------------------------- the alternates line up */

/**
 * FOUR PLACES DESCRIBE THE SAME FACT, AND THEY MUST AGREE.
 *
 * A church's runner-up logos appear on the record (`logo_alts`), as a count on
 * the index row (`la`), in the MANIFEST map, and as files in the archives. The
 * reviewer picks from that list and the church receives whichever they choose, so
 * a disagreement is not cosmetic: an `la` that overstates the array badges an
 * option that is not offered, and a sha with no file behind it renders as a
 * broken tile and then exports a demo with NO LOGO AT ALL — silently, because
 * the export route treats missing bytes as "a missing picture is a worse demo,
 * not a wrong one".
 *
 * There is no equivalent check for `lo` today, and there should be; this is the
 * same argument the per-record sha verification above already won.
 */
const haveLogo = new Set(logoNames);
const laMismatch: string[] = [];
const shaMissing: string[] = [];
const manifestAlts = manifest.logo_alts?.churches ?? {};

for (const row of index) {
  const shas = altShasByOrg.get(row.id) ?? [];
  const declared = row.la ?? 0;
  const fromManifest = manifestAlts[row.id] ?? [];

  // COMPARED BY IDENTITY, NOT BY LENGTH. The MANIFEST now carries the shas
  // themselves, so "two alternatives here and two there" can be checked as "the
  // same two" — and it is the publisher that reads this map, so a manifest naming
  // a member the record does not offer uploads an object nothing will ever ask
  // for, while a record offering one the manifest omits is a tile that 404s.
  if (
    declared !== shas.length ||
    (Object.keys(manifestAlts).length && fromManifest.join(",") !== shas.join(","))
  ) {
    if (laMismatch.length < 5) {
      laMismatch.push(
        `${row.id}: la=${declared} record=${shas.length} manifest=${fromManifest.length}` +
          (fromManifest.length === shas.length ? " (same count, different shas)" : ""),
      );
    }
  }
  for (const sha of shas) {
    if (!sha || !haveLogo.has(`${sha}.webp`)) {
      if (shaMissing.length < 5) shaMissing.push(`${row.id} -> ${sha || "(no sha)"}`);
    }
  }
}

if (laMismatch.length) {
  die(
    `the index's 'la' count disagrees with the records' logo_alts:\n    ` +
      laMismatch.join("\n    "),
  );
}
if (shaMissing.length) {
  die(
    `${shaMissing.length}+ logo_alts shas have no file in either archive:\n    ` +
      shaMissing.join("\n    ") +
      `\n  An option we cannot render is an option we must not offer.`,
  );
}

if (paletteBad.length) {
  die(
    `a colour ramp does not belong to the logo it is attached to:\n    ` +
      paletteBad.join("\n    ") +
      `\n  This one is invisible: it renders, and it renders the wrong church's colours.`,
  );
}
if (rampMissing.length) {
  die(
    `${rampMissing.length}+ alternatives carry a palette with no theme ramp:\n    ` +
      rampMissing.join("\n    "),
  );
}

const withAlts = altShasByOrg.size;
console.log(
  `  logo_alts           ${withAlts} churches offer alternatives · every sha resolves`,
);
console.log(
  `  palettes            every ramp joins to the logo it was measured from`,
);

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
  /** Every thumb in the prefix — picks and runner-ups, which share one namespace. */
  n_logos: logoNames.length,
  n_logo_picks: pickNames.length,
  n_logo_alts: altNames.length,
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
