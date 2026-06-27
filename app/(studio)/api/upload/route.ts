import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB — logos are tiny; this is just a guard.
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/**
 * POST /api/upload — store an uploaded church logo in Blob and return a URL the
 * admin can drop straight into a demo's `logoUrl`.
 *
 * The blob is stored PRIVATE (the same access the church configs use — this
 * store is private), and served back publicly via the `/api/asset/...` proxy
 * route. That keeps everything in one store with no public-access requirement.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Use a PNG, JPG, WebP, GIF, or SVG image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 4 MB)" }, { status: 400 });
  }

  try {
    const blob = await put(`logos/logo.${ext}`, file, {
      access: "private",
      addRandomSuffix: true, // unique pathname per upload, so replacing never clobbers
      contentType: file.type,
    });
    // Serve via our proxy (stable, same-origin, works in the demo + emails).
    return NextResponse.json({ url: `/api/asset/${blob.pathname}` });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
