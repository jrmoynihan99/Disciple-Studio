import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PUSHPAY_CHURCHES,
  consentUrl,
  STATE_TTL_DAYS,
} from "@/lib/pushpay/broker";

export const dynamic = "force-dynamic";

/**
 * GET /api/pushpay/consent-link?church=<slug> — generates the Pushpay Giving
 * authorize URL to hand a church's admin (basic-auth gated via middleware,
 * same as the demo studio). Each call mints a freshly-signed state, valid for
 * STATE_TTL_DAYS.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("church") ?? "";
  const church = PUSHPAY_CHURCHES[slug];
  if (!church) {
    return NextResponse.json(
      {
        error: `Unknown church "${slug}".`,
        valid: Object.keys(PUSHPAY_CHURCHES),
      },
      { status: 404 },
    );
  }
  return NextResponse.json({
    church: church.slug,
    expiresInDays: STATE_TTL_DAYS,
    url: consentUrl(church),
  });
}
