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