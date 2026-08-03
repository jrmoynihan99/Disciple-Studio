import { getUserId } from "@/lib/leads/server/userId";
import { readGroup } from "@/lib/leads/server/groups";
import { getAsset, getRecord } from "@/lib/leads/server/dataset";
import { resolve, statusOf } from "@/lib/leads/engine/group";
import { isSafeGroupId } from "@/lib/leads/engine/group-types";
import { extrasOf, toRawChurch } from "@/lib/leads/engine/demo-export";
import { getChurch, saveChurch } from "@/churches";
import { baseSlugFor, generateDemo } from "@/lib/generateDemo";
import { LogoError, putLogo } from "@/lib/logo";

/**
 * Generate ONE demo from one reviewed church in a batch.
 *
 * The sibling of the deleted `POST /api/import`, and deliberately the same shape:
 * one church per request, so the browser can drive the loop and count `x / y` as
 * the responses land. A single "export the whole batch" call would be simpler and
 * would show a spinner for two minutes with nothing to say.
 *
 * WHY THE WORK IS HERE AND NOT IN THE BROWSER. The old import page read the logo
 * off the user's disk and posted the bytes. A batch's logos live in R2 behind the
 * console's Basic auth, and the generated demo at `/c/<slug>` is PUBLIC — so a
 * leads asset URL handed to a church would 401 for them. The bytes have to be
 * copied into the demo store, and doing that server-side is one hop instead of
 * three with credentials in the middle.
 *
 * NOTHING IS MARKED EXPORTED HERE. This route is idempotent per church and may be
 * retried; the batch only becomes history when the client has a demo group to
 * point at — see `export/finish`.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; orgId: string }> };

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(_req: Request, ctx: Ctx) {
  const userId = await getUserId();
  if (!userId) return bad("No identity cookie. Reload to obtain one.", 401);

  const { id, orgId } = await ctx.params;
  if (!isSafeGroupId(id)) return bad("Not a group id", 404);

  const group = await readGroup(userId, id);
  if (!group) return bad(`No batch named ${id}`, 404);
  if (statusOf(group) === "exported") {
    return bad("This batch has already been sent. Its demos are already generated.", 409);
  }

  const entry = group.entries.find((e) => e.orgId === orgId);
  if (!entry) return bad(`${orgId} is not in this batch`, 404);

  const card = resolve(entry);

  /**
   * The live record supplies only what a reviewer never sees — the colour ramp
   * and the service time. A church that has left the dataset returns null and
   * simply gets template defaults; it must not fail the export, because the batch
   * card is explicitly "the only copy we hold" for exactly those churches.
   */
  const record = await getRecord(orgId).catch(() => null);
  const { church, reason } = toRawChurch(card, extrasOf(record));
  if (!church) {
    return Response.json({ skipped: true, churchName: card.name.text || orgId, reason });
  }

  /**
   * COPY THE LOGO INTO THE DEMO STORE, content-addressed, exactly as a folder
   * import did. `putLogo` hashes the bytes and skips the write when they are
   * already there, so re-exporting the same church costs a HEAD.
   *
   * A logo failure never fails the demo — the same call the import route makes,
   * for the same reason: a missing picture is a worse demo, not a wrong one.
   */
  let logoUrl: string | undefined;
  if (card.logo?.sha) {
    try {
      // `getAsset`, not `r2Asset`: the console reads the corpus from R2 in
      // production and from `data/leads/pack` locally, and an export that only
      // worked against one of them would be a demo with no logo on a dev machine.
      const bytes = await getAsset("logos-thumb", `${card.logo.sha}.webp`);
      if (bytes) {
        logoUrl = await putLogo(
          new File([new Uint8Array(bytes)], `${card.logo.sha}.webp`, { type: "image/webp" }),
        );
      }
    } catch (err) {
      if (!(err instanceof LogoError)) console.warn(`leads/export: logo for ${orgId}`, err);
    }
  }

  // Deterministic per church, diverging only on a genuine name collision, so a
  // re-export overwrites the same demo rather than growing a second one. Same
  // rule the import route applied.
  let slug = baseSlugFor(church);
  const existing = await getChurch(slug);
  if (existing && existing.churchName !== church.church_title) {
    slug = `${slug}-${church.org_id}`;
  }

  const config = generateDemo(church, { logoUrl, slug });
  if (!config) {
    return Response.json({
      skipped: true,
      churchName: church.church_title,
      reason: "no usable steps",
    });
  }

  try {
    await saveChurch(config);
  } catch {
    return bad("Could not save the demo", 500);
  }

  return Response.json({
    ok: true,
    row: {
      churchName: config.churchName,
      slug,
      demoPath: `/c/${slug}`,
      contacts: church.contacts ?? null,
    },
  });
}
