import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
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
 *
 * Add `&go=1` to be redirected straight to Pushpay instead of getting JSON.
 * Copying the URL out of the JSON by hand is how a sandbox attempt failed:
 * the selection picked up the response's trailing `"}` and the paste
 * percent-encoded the whole string a second time, so Pushpay saw `%253A` for
 * every `:` and rejected the redirect URI. Handing the browser a Location
 * header keeps the bytes we generated. JSON stays the default for emailing a
 * link to a church admin.
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

  const url = consentUrl(church);
  // Throws NEXT_REDIRECT, so it must stay outside any try/catch.
  if (req.nextUrl.searchParams.get("go")) redirect(url);

  return NextResponse.json({
    church: church.slug,
    expiresInDays: STATE_TTL_DAYS,
    url,
  });
}
