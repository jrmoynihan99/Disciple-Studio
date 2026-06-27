import { NextResponse } from "next/server";
import { getAllChurches } from "@/churches";

export const dynamic = "force-dynamic";

/** GET /api/churches — list demos (summary) for the index page. */
export async function GET() {
  const churches = await getAllChurches();
  const summary = churches.map((c) => ({
    slug: c.slug,
    churchName: c.churchName,
    template: c.template,
    accent: c.brand?.accent ?? c.brand?.accentLight ?? c.brand?.accentDark ?? null,
  }));
  return NextResponse.json(summary);
}
