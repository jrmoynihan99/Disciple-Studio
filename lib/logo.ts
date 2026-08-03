import { head, put } from "@vercel/blob";
import { createHash } from "node:crypto";

/**
 * Shared logo-upload logic used by both the single-file `/api/upload` route and
 * the bulk `/api/import` route, so the accepted formats and storage rules stay
 * in one place.
 */

export const MAX_LOGO_BYTES = 4 * 1024 * 1024; // 4 MB — logos are tiny.

/** Accepted image MIME types → stored file extension. `.avif` and `.ico` were
 *  added for the pilot dataset (browsers report `.ico` under two MIME types). */
export const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/vnd.microsoft.icon": "ico",
  "image/x-icon": "ico",
};

export class LogoError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Validate and store one logo file in Blob, returning the same-origin proxy URL
 * the demos use (`/api/asset/<pathname>`). Throws `LogoError` on a bad file.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE FILENAME IS THE HASH OF THE FILE. That is what makes a re-import free.
 *
 * This used to write `logos/logo.<ext>` with `addRandomSuffix: true`, so the same
 * image uploaded twice became two blobs and the first was abandoned with nothing
 * pointing at it. The store held 115 logos against 5 demo configs.
 *
 * That is not just clutter. NOTHING IN THIS CODEBASE EVER DELETES A LOGO —
 * `deleteChurch` removes the church config and stops there — so the strays
 * accumulate forever, and every one of them cost a `put`: an "advanced operation"
 * against a 2,000/month allowance whose exhaustion suspended this store once
 * already and took the live demos down with it.
 *
 * Content-addressing removes the whole class of problem: same bytes, same key,
 * every time. Re-importing a group of demos rewrites nothing. It is also what the
 * lead corpus already does for its 14,254 thumbnails
 * (`logos-thumb/<sha256>.webp`), so there is now one rule for images here.
 *
 * SAFE TO SHARE ONE BLOB between two churches with the same logo precisely
 * BECAUSE nothing deletes them — there is no path by which removing one demo can
 * break another's image.
 *
 * Old `logos/logo-<random>.<ext>` objects are left exactly where they are, and
 * the configs pointing at them keep working. This changes what NEW uploads are
 * called and nothing else.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function putLogo(file: File): Promise<string> {
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) throw new LogoError("Use a PNG, JPG, WebP, GIF, SVG, AVIF, or ICO image");
  if (file.size > MAX_LOGO_BYTES) throw new LogoError("Image too large (max 4 MB)");

  // Buffered once. `MAX_LOGO_BYTES` above already caps this at 4 MB, and the
  // bytes have to be hashed before they can be named.
  const bytes = Buffer.from(await file.arrayBuffer());
  const pathname = `logos/${createHash("sha256").update(bytes).digest("hex")}.${ext}`;

  /**
   * Already stored → don't write it again.
   *
   * The `put` would be harmless (identical bytes to the same key) but it still
   * spends an advanced operation, and re-importing a group of demos is exactly
   * when that adds up. A `head` that throws for ANY reason — not there,
   * unreachable, an SDK change — falls through to the write, so the worst this
   * can cost is the operation it was trying to save. It can never lose an upload.
   */
  try {
    if (await head(pathname)) return `/api/asset/${pathname}`;
  } catch {
    /* not stored yet, or could not ask — write it. */
  }

  await put(pathname, bytes, {
    access: "private",
    // The pathname IS the identity now, so a suffix would defeat the point.
    // `allowOverwrite` is required with it: re-writing the same key is the
    // normal case here, and the SDK throws on a repeat without it.
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: file.type,
  });
  // Built from the key, not from the `put` result: the key is deterministic, and
  // the URL must be the same whether we wrote just now or skipped the write.
  return `/api/asset/${pathname}`;
}
