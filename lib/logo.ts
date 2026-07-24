import { put } from "@vercel/blob";

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
 */
export async function putLogo(file: File): Promise<string> {
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) throw new LogoError("Use a PNG, JPG, WebP, GIF, SVG, AVIF, or ICO image");
  if (file.size > MAX_LOGO_BYTES) throw new LogoError("Image too large (max 4 MB)");

  const blob = await put(`logos/logo.${ext}`, file, {
    access: "private",
    addRandomSuffix: true, // unique pathname per upload, so replacing never clobbers
    contentType: file.type,
  });
  return `/api/asset/${blob.pathname}`;
}
