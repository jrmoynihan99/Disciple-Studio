import { list, put, del, get } from "@vercel/blob";
import type { ChurchConfig } from "@/lib/types";

/**
 * Access mode of the Blob store. Must match how the store was created in
 * Vercel. The store is configured "private", so configs aren't publicly
 * fetchable — the demo page reads them server-side via the authenticated SDK.
 * If you ever recreate the store as public, change this to "public".
 */
const ACCESS = "private" as const;

/**
 * The registry of all church demos — stored as one JSON blob per church in
 * Vercel Blob, named `churches/<slug>.json`. Creating / editing / deleting a
 * demo writes or removes a blob (the /admin editor and the index page's Delete
 * button do this via the API routes). This works on Vercel's read-only runtime
 * filesystem, so demos can be authored live from disciple.studio/admin.
 *
 * Server-only (uses the Blob server SDK + BLOB_READ_WRITE_TOKEN). Consumed by
 * the demo route and the API. The admin (a client) talks to the API instead.
 *
 * Blobs are written with `cacheControlMaxAge: 0` and read with `no-store` so a
 * just-saved demo is reflected immediately rather than served stale from the
 * blob CDN.
 *
 * Isolation: a demo is reachable at `/c/<slug>` only if its blob exists; any
 * other slug 404s.
 */

const PREFIX = "churches/";
const pathnameFor = (slug: string) => `${PREFIX}${slug}.json`;

/** Fetch and parse a single church blob by pathname (authenticated read). */
async function readChurch(pathname: string): Promise<ChurchConfig | null> {
  try {
    const result = await get(pathname, { access: ACCESS });
    if (!result?.stream) return null;
    return (await new Response(result.stream).json()) as ChurchConfig;
  } catch {
    return null;
  }
}

/** Load and parse every church config. */
export async function getAllChurches(): Promise<ChurchConfig[]> {
  let blobs;
  try {
    ({ blobs } = await list({ prefix: PREFIX, limit: 1000 }));
  } catch {
    return [];
  }
  const configs = await Promise.all(
    blobs.filter((b) => b.pathname.endsWith(".json")).map((b) => readChurch(b.pathname)),
  );
  return configs
    .filter((c): c is ChurchConfig => c !== null)
    .sort((a, b) => a.churchName.localeCompare(b.churchName));
}

/** Every routable slug. */
export async function getAllSlugs(): Promise<string[]> {
  return (await getAllChurches()).map((c) => c.slug);
}

/** Look up one church by slug, or null if it doesn't exist (→ 404). */
export async function getChurch(slug: string): Promise<ChurchConfig | null> {
  return readChurch(pathnameFor(slug));
}

/**
 * The same read, except A STORE FAILURE THROWS instead of reading as "no demo".
 *
 * `readChurch` wraps `get()` in `try { } catch { return null }`, which is right
 * for a page that wants a 404 — but the SDK already returns null for a genuine
 * 404 and throws only on a real fault, so that catch converts "I could not ask"
 * into "there is nothing there". Harmless everywhere except in `slugFor`, which
 * treats a null as permission to take the bare slug, and `saveChurch` writes
 * with `allowOverwrite: true`. One dropped GET is then enough to overwrite a
 * different church's live demo at a URL that may already have been sent.
 *
 * Note `put()` retries internally and `get()` does not, so this asymmetry is not
 * theoretical — but it does need a transient GET failure while the API is
 * otherwise healthy, which is why it is a separate function rather than a change
 * to the shared one.
 */
export async function getChurchStrict(slug: string): Promise<ChurchConfig | null> {
  const result = await get(pathnameFor(slug), { access: ACCESS });
  if (!result?.stream) return null;
  return (await new Response(result.stream).json()) as ChurchConfig;
}

/**
 * Does this demo's blob exist at all? Cheap, and NOT served from the CDN.
 *
 * `get()` reads through the blob CDN and is eventually consistent, so a demo
 * written seconds ago can read back as missing — which is why `/c/<slug>` waits
 * that window out. `list()` is the store's own index and shows a just-saved blob
 * immediately, which is the property `lib/groups.ts` already relies on.
 *
 * That makes this the signal the retry loop was missing: it separates "written,
 * not visible yet — worth waiting for" from "never existed", and the second case
 * is every crawler, every guessed URL, and every church holding a link to a demo
 * that was deleted. Those used to cost 6.6 seconds of billed compute each.
 */
export async function churchBlobExists(slug: string): Promise<boolean> {
  try {
    const { blobs } = await list({ prefix: pathnameFor(slug), limit: 1 });
    return blobs.some((b) => b.pathname === pathnameFor(slug));
  } catch {
    // Could not ask. Say yes, so the caller falls back to the patient path —
    // a slow 404 is a worse answer than a wrong one, but a WRONG 404 on a real
    // demo is worse than both.
    return true;
  }
}

/** Create or overwrite a church's blob. */
export async function saveChurch(config: ChurchConfig): Promise<void> {
  await put(pathnameFor(config.slug), JSON.stringify(config, null, 2) + "\n", {
    access: ACCESS,
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

/** Remove a church's blob. No-op if it's already gone. */
export async function deleteChurch(slug: string): Promise<void> {
  try {
    const { blobs } = await list({ prefix: pathnameFor(slug), limit: 1 });
    const exact = blobs.find((b) => b.pathname === pathnameFor(slug));
    if (exact) await del(exact.url);
  } catch {
    /* already gone — treat as success */
  }
}