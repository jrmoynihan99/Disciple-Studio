import { NextResponse } from "next/server";
import { LogoError, putLogo } from "@/lib/logo";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload — store an uploaded church logo in Blob and return a URL the
 * admin can drop straight into a demo's `logoUrl`.
 *
 * The blob is stored PRIVATE (the same access the church configs use — this
 * store is private), and served back publicly via the `/api/asset/...` proxy
 * route. That keeps everything in one store with no public-access requirement.
 * Validation + storage live in `lib/logo.ts`, shared with the bulk import route.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const url = await putLogo(file);
    // Serve via our proxy (stable, same-origin, works in the demo + emails).
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof LogoError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
