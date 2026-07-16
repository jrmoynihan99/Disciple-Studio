import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CCB_CHURCHES, consentUrl, STATE_TTL_DAYS } from "@/lib/ccb/broker";

export const dynamic = "force-dynamic";

/**
 * GET /api/ccb/consent-link?church=<slug> — generates the CCB authorize URL
 * to hand a church's Master Admin (basic-auth gated via middleware, same as
 * the demo studio). Each call mints a freshly-signed state, valid for
 * STATE_TTL_DAYS.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("church") ?? "";
  const church = CCB_CHURCHES[slug];
  if (!church) {
    return NextResponse.json(
      {
        error: `Unknown church "${slug}".`,
        valid: Object.keys(CCB_CHURCHES),
      },
      { status: 404 },
    );
  }
  return NextResponse.json({
    church: church.slug,
    subdomain: church.subdomain,
    expiresInDays: STATE_TTL_DAYS,
    url: consentUrl(church),
  });
}
