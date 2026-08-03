import "server-only";

/**
 * One S3 client for Cloudflare R2, shared by everything in the app that stores
 * bytes.
 *
 * WHY THIS FILE EXISTS AT ALL. Before it, `lib/leads/server/r2-source.ts` and
 * `scripts/leads-publish.mts` each built their own `AwsClient` and their own
 * XML-scraping `list`. Porting the batch store and the demo store by copy-paste
 * would have made four copies of a signing setup and a pagination loop — and the
 * failure mode of a drifted copy here is "one subsystem silently talks to the
 * wrong bucket", which looks like missing data rather than like a bug.
 *
 * WHY IT IS NOT UNDER `lib/leads/`. Demo generation is not lead-console code and
 * must not import from it. This is the shared floor both stand on.
 *
 * WHY R2 AND NOT VERCEL BLOB. Blob's Hobby tier allows 2,000 "advanced
 * operations" a month and every `put()` and `list()` is one. This app's shape —
 * a `list()` on page load and two `put()`s per 1.5s autosave — spends that in a
 * few sessions, and publishing the corpus (14,511 objects) exceeded it sevenfold
 * in one run and suspended the store. R2 allows 1,000,000 writes a month, bills
 * for overage rather than switching the feature off, and charges nothing for
 * egress.
 *
 * KEYS ARE NOT URL-ENCODED HERE, deliberately. aws4fetch signs the URL exactly as
 * given, so encoding has to match between signing and sending or every request
 * 403s. Every caller gates its key segments through a character class first
 * (`SAFE_USER_ID`, `isSafeGroupId`, `SAFE_ASSET`, a sha256), so keys reaching
 * this module are already URL-safe. **A new caller must do the same** rather than
 * encoding here.
 */

import { AwsClient } from "aws4fetch";

const ENV = [
  "R2_ACCOUNT_ID",
  "R2_BUCKET_DATA",
  "R2_BUCKET_LOGOS",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
] as const;

export interface R2Env {
  account: string;
  /** Never public. Church records, and all mutable app state under `state/`. */
  data: string;
  /** May go behind a CDN — sha256-named images identify nothing on their own. */
  logos: string;
  keyId: string;
  secret: string;
}

/**
 * Names the missing thing.
 *
 * The ways a deployment can be wrong here are "nobody set the credentials",
 * "nobody ran the publish" and "somebody published to a different account", and
 * before this they produced, respectively, a stack trace, a blank console and a
 * bare 404.
 *
 * Read lazily, never at module load: a build must not fail because the build
 * machine has no credentials — only a request that actually needs them.
 */
export function r2Env(): R2Env {
  const missing = ENV.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    throw new Error(
      `R2 is not configured — missing ${missing.join(", ")}. See data/leads/README.md.`,
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
let clientKeyId: string | null = null;

export function r2Client(): { r2: AwsClient; base: string } {
  const e = r2Env();
  // Rebuild if the credentials changed underneath — only reachable in dev, when
  // `.env.local` is edited and the module survives the reload. A stale client
  // would sign with the old key and 403 on everything, which reads like a broken
  // bucket rather than an edited file.
  if (!client || clientKeyId !== e.keyId) {
    // `region: "auto"` is what R2 expects; SigV4 still requires one to sign with.
    client = new AwsClient({
      accessKeyId: e.keyId,
      secretAccessKey: e.secret,
      service: "s3",
      region: "auto",
    });
    clientKeyId = e.keyId;
  }
  return { r2: client, base: `https://${e.account}.r2.cloudflarestorage.com` };
}

/** The object's bytes, or null if it is not there. Throws on any other status. */
export async function r2Get(bucket: string, key: string): Promise<Buffer | null> {
  const { r2, base } = r2Client();
  const res = await r2.fetch(`${base}/${bucket}/${key}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 ${res.status} reading ${bucket}/${key}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Overwrite the object.
 *
 * `cacheControl` defaults to `no-store`, which is right for everything mutable.
 * Immutable, content-addressed objects (the published corpus, demo logos named
 * by content hash) should pass a long `immutable` value — that is also what a CDN
 * in front of the logos bucket reads.
 */
export async function r2Put(
  bucket: string,
  key: string,
  body: Buffer | string,
  contentType: string,
  cacheControl = "no-store",
): Promise<void> {
  const { r2, base } = r2Client();

  /**
   * BUFFER AND AN EXPLICIT LENGTH, BOTH DELIBERATE — this failed in production
   * shape before it was fixed, with `411 MissingContentLength`.
   *
   * S3 requires `Content-Length` on a PUT; it does not accept chunked transfer
   * encoding. aws4fetch wraps the request in a `Request` before signing it, and a
   * `Request` body is a `ReadableStream` — so undici sends it chunked with no
   * length, and R2 rejects it. Inferring the length from the fetch layer is not
   * something to rely on.
   *
   * The string is encoded to a Buffer first so the length is UTF-8 BYTES rather
   * than UTF-16 code units. A church name with an accent or an emoji in it makes
   * those two numbers differ, and a Content-Length shorter than the body is a
   * truncated object — a batch that looks saved and is not, which is the worst
   * outcome this system has.
   */
  const bytes = typeof body === "string" ? Buffer.from(body, "utf8") : body;

  const res = await r2.fetch(`${base}/${bucket}/${key}`, {
    method: "PUT",
    // `Buffer` is an `ArrayBufferView` and a perfectly good fetch body at
    // runtime; the DOM's `BodyInit` union just does not name it.
    body: bytes as unknown as BodyInit,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "Content-Length": String(bytes.byteLength),
    },
  });
  if (!res.ok) {
    throw new Error(`R2 ${res.status} writing ${bucket}/${key}: ${(await res.text()).slice(0, 200)}`);
  }
}

/**
 * Every key under `prefix`, following continuation tokens to the end.
 *
 * Listed in pages rather than probed one key at a time: a HEAD per object would
 * be one round trip per object to answer a question a single page usually can.
 *
 * The response is XML and is scraped with a regex rather than parsed. That is
 * deliberate — the shape is two fixed tags, and the alternative is an XML parser
 * in the bundle for this one call. The reference implementation is
 * `scripts/leads-publish.mts`, which has listed 14,511 keys this way.
 */
export async function r2List(bucket: string, prefix: string): Promise<string[]> {
  const { r2, base } = r2Client();
  const out: string[] = [];
  let token: string | undefined;
  do {
    const url =
      `${base}/${bucket}?list-type=2&max-keys=1000&prefix=${encodeURIComponent(prefix)}` +
      (token ? `&continuation-token=${encodeURIComponent(token)}` : "");
    const res = await r2.fetch(url);
    if (!res.ok) throw new Error(`R2 ${res.status} listing ${bucket}/${prefix}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) out.push(decodeXml(m[1]));
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? decodeXml(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1] ?? "")
      : undefined;
  } while (token);
  return out;
}

/** Idempotent: a key that is already gone is a success, because S3 says so. */
export async function r2Delete(bucket: string, key: string): Promise<void> {
  const { r2, base } = r2Client();
  const res = await r2.fetch(`${base}/${bucket}/${key}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 ${res.status} deleting ${bucket}/${key}`);
  }
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Last, or `&amp;lt;` would decode twice into `<`.
    .replace(/&amp;/g, "&");
}
