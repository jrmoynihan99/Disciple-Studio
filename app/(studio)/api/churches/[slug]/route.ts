import { NextResponse } from "next/server";
import { getChurch, saveChurch, deleteChurch } from "@/churches";
import type { ChurchConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]+$/;
const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

/** GET /api/churches/[slug] — the full config (for the editor). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = await getChurch(slug);
  if (!config) return bad("Not found", 404);
  return NextResponse.json(config);
}

/** PUT /api/churches/[slug] — create or update. Body is the full ChurchConfig.
 *  If the body's slug differs from the route slug, the old blob is removed
 *  (rename). */
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let body: ChurchConfig;
  try {
    body = (await req.json()) as ChurchConfig;
  } catch {
    return bad("Invalid JSON body");
  }
  const newSlug = body?.slug;
  if (!newSlug || !SLUG_RE.test(newSlug)) return bad("Config needs a slug of [a-z0-9-]");

  try {
    await saveChurch(body);
    if (SLUG_RE.test(slug) && slug !== newSlug) {
      await deleteChurch(slug);
    }
  } catch {
    return bad("Could not save demo", 500);
  }
  return NextResponse.json({ ok: true, slug: newSlug });
}

/** DELETE /api/churches/[slug] — remove the demo's blob. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return bad("Invalid slug");
  try {
    await deleteChurch(slug);
  } catch {
    /* already gone — treat as success */
  }
  return NextResponse.json({ ok: true });
}