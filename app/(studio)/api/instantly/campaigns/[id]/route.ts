import { NextResponse } from "next/server";
import { getCampaignSteps } from "@/lib/leads/server/instantly";

/**
 * GET /api/instantly/campaigns/[id] — the sequence, for the final-review preview.
 *
 * Fetched once when a campaign is chosen and rendered in the browser against the
 * variables the plan already returned, so switching between churches is instant
 * and costs nothing.
 *
 * Gated by the `/api/instantly/:path*` entry in `proxy.ts`.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return NextResponse.json({ steps: await getCampaignSteps(id) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load the sequence" },
      { status: 503 },
    );
  }
}
