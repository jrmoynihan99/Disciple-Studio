import { NextResponse } from "next/server";
import { listCampaigns } from "@/lib/leads/server/instantly";

/**
 * GET /api/instantly/campaigns — what the push picker offers.
 *
 * Read live from Instantly rather than configured here, so adding a third
 * sequence version is a thing done in Instantly and not a deploy.
 *
 * GATED. `proxy.ts` has an explicit `/api/instantly/:path*` entry — this route
 * spends an account API key and the sibling POST creates leads, so it ships
 * closed for the same reason `/api/upload` does.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ campaigns: await listCampaigns() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not reach Instantly";
    // 503, not 500: the key being unset or Instantly being down are both
    // "try again once something outside this app changes", and the picker
    // renders that differently from a bug.
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
