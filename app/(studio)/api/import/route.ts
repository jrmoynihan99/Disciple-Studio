import { NextResponse } from "next/server";
import { getChurch, saveChurch } from "@/churches";
import { generateDemo, baseSlugFor, type RawChurch } from "@/lib/generateDemo";
import { LogoError, putLogo } from "@/lib/logo";

export const dynamic = "force-dynamic";

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

/**
 * POST /api/import — generate and save ONE church demo from a pilot row.
 *
 * The client drives the bulk import, sending one request per church (batched a
 * few at a time to spare the Blob store). Multipart body:
 *   - `church` — JSON string of one `next_steps.json` row.
 *   - `logo`   — optional image File (the church's bundled `logo_local`).
 *
 * Returns the row the client accumulates into the group's output spreadsheet,
 * or `{ skipped: true }` when the church has no usable steps.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return bad("Expected multipart form data");

  const churchRaw = form.get("church");
  if (typeof churchRaw !== "string") return bad("Missing church JSON");

  let church: RawChurch;
  try {
    church = JSON.parse(churchRaw) as RawChurch;
  } catch {
    return bad("Invalid church JSON");
  }
  if (!church?.church_title) return bad("church_title is required");

  // Upload the logo if one was sent; fall back to the remote URL in generateDemo.
  let logoUrl: string | undefined;
  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    try {
      logoUrl = await putLogo(logo);
    } catch (err) {
      // A bad logo shouldn't kill the demo — fall back to remote/initial.
      if (!(err instanceof LogoError)) {
        // Unexpected storage failure — surface it.
        return bad("Logo upload failed", 500);
      }
    }
  }

  // Resolve the slug: deterministic per church, only diverging on a genuine
  // name collision so re-imports overwrite the same demo rather than duplicate.
  let slug = baseSlugFor(church);
  const existing = await getChurch(slug);
  if (existing && existing.churchName !== church.church_title) {
    slug = `${slug}-${church.org_id}`;
  }

  const config = generateDemo(church, { logoUrl, slug });
  if (!config) {
    return NextResponse.json({ skipped: true, churchName: church.church_title });
  }

  try {
    await saveChurch(config);
  } catch {
    return bad("Could not save demo", 500);
  }

  return NextResponse.json({
    ok: true,
    row: {
      churchName: config.churchName,
      contactName: (church.contact_name ?? "").trim(),
      contactEmail: (church.contact_email ?? "").trim(),
      slug,
      demoPath: `/c/${slug}`,
    },
  });
}
