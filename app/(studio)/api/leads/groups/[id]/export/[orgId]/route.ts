import { getUserId } from "@/lib/leads/server/userId";
import { readGroup } from "@/lib/leads/server/groups";
import { getAsset, getRecord } from "@/lib/leads/server/dataset";
import { resolve, statusOf } from "@/lib/leads/engine/group";
import { isSafeGroupId } from "@/lib/leads/engine/group-types";
import type { ExportGroup } from "@/lib/leads/engine/group-types";
import { extrasOf, toRawChurch } from "@/lib/leads/engine/demo-export";
import { getChurchStrict, saveChurch } from "@/churches";
import { baseSlugFor, generateDemo, slugify, type RawChurch } from "@/lib/generateDemo";
import { LogoError, putLogo } from "@/lib/logo";
import { withAccent } from "@/lib/leads/engine/accent";

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

/**
 * WHERE THIS CHURCH'S DEMO LIVES — and which church that slug already belongs to.
 *
 * A NAME IS NOT AN IDENTITY. This used to read the demo already sitting at the
 * slug and keep it when `churchName` matched, on the reasoning that an identical
 * name meant the same church being re-exported. Measured against the corpus that
 * is wrong 4,403 times: `First Baptist Church` names 84 different congregations,
 * `Calvary Baptist Church` 54, `Grace Baptist Church` 33. Two of them in one
 * batch overwrote each other's demo in silence, and both `GroupRow`s pointed at
 * the same `/c/<slug>` — so one church was sent a page built from another
 * church's steps, quotes and staff.
 *
 * TWO COLLISIONS, ANSWERED SEPARATELY, BECAUSE ONLY ONE OF THEM CAN BE LOOKED UP.
 *
 *  1. WITHIN THIS BATCH — decided from the batch itself, with no read at all.
 *     Exports run three at a time and Vercel Blob is eventually consistent, so
 *     `getChurch` can return null for a demo written a second earlier in this
 *     same run: two churches called `First Baptist Church` would each look, each
 *     see nothing, and each take the bare slug. The batch is already in hand and
 *     is the same for every request in the run, so the answer is computed rather
 *     than observed — and every colliding church is suffixed, including the
 *     first, so the result does not depend on which request lands first.
 *
 *  2. AGAINST DEMOS ALREADY IN THE STORE — `sourceOrgId`, which is the identity
 *     `churchName` never was. A demo written before that field existed has none,
 *     and is therefore treated as SOMEBODY ELSE: the export takes a new slug
 *     instead of overwriting a demo it cannot prove is the same church. Failing
 *     towards a spare demo rather than towards a destroyed one is the only safe
 *     direction here, because the thing at stake is a URL that may already have
 *     been sent to a congregation.
 */
async function slugFor(
  church: RawChurch,
  group: ExportGroup,
  orgId: string,
): Promise<string> {
  const base = baseSlugFor(church);

  // `resolve` because the name a reviewer typed is the name the slug comes from.
  // Twenty pure resolves per request, which is cheaper than being wrong.
  const twinInBatch = group.entries.some(
    (e) =>
      e.orgId !== orgId &&
      baseSlugFor({ church_title: resolve(e).name.text.trim(), org_id: e.orgId }) === base,
  );
  if (twinInBatch) return `${base}-${slugify(orgId)}`;

  /**
   * A READ THAT FAILED IS NOT AN EMPTY SLUG. See `getChurchStrict`.
   *
   * The plain `getChurch` swallows a store fault into `null`, and `null` here
   * means "nothing is there, take the bare slug" — which `saveChurch` then
   * writes over with `allowOverwrite: true`. So one dropped GET could destroy a
   * different church's live demo. Suffixing on the unknown case costs a spare
   * demo, which is the same direction every other decision in this function
   * fails towards, and for the same reason: the thing at stake is a URL that
   * may already be with a congregation.
   */
  let existing;
  try {
    existing = await getChurchStrict(base);
  } catch {
    return `${base}-${slugify(orgId)}`;
  }
  return existing && existing.sourceOrgId !== orgId ? `${base}-${slugify(orgId)}` : base;
}

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
  /**
   * THE RAMP IS THE ONE MEASURED FROM THE LOGO THIS CARD IS SHIPPING. `card.logo`
   * is whatever the reviewer settled on — the pipeline's pick, or a candidate
   * they chose instead — and every candidate carries its own colours, so the
   * demo is painted from the image it displays rather than from the image the
   * pipeline happened to pick first. See `paletteOfLogo`.
   */
  const { church, reason } = toRawChurch(card, extrasOf(record, card.logo?.sha));
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
  /**
   * A TRIMMED LOGO IS ALREADY IN THE DEMO STORE, so there is nothing to copy.
   *
   * The crop is performed in the browser against this same thumbnail and its
   * result is written through `putLogo` at the moment it is made — content
   * addressed, same store, same `/api/asset/...` proxy the copy below produces.
   * `resolve()` has already checked it belongs to the mark this card is
   * shipping, so taking it here is taking the picture the reviewer approved.
   */
  let logoUrl: string | undefined = card.logoCrop?.url;
  if (!logoUrl && card.logo?.sha) {
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

  const slug = await slugFor(church, group, orgId);

  const config = generateDemo(church, { logoUrl, slug });
  if (!config) {
    return Response.json({
      skipped: true,
      churchName: church.church_title,
      reason: "no usable steps",
    });
  }

  /**
   * THE ACCENT A REVIEWER CHOSE, APPLIED TO THE PALETTE `generateDemo` BUILT.
   *
   * Here rather than inside `generateDemo` because it is a correction to that
   * function's answer, not an input to it: the ramp is measured from the logo,
   * and this says "the measurement is not their colour, this is". Applied to the
   * finished `themeOverrides` it also covers the case a `theme_light.accent`
   * override could not — a church with no measured ramp at all, whose demo ships
   * the studio preset and which `mapTheme` therefore returns nothing for. Those
   * are the greyscale-logo churches, which is to say the ones most likely to
   * need this.
   *
   * `withAccent` is the same function the review card previews through, so the
   * page a church opens is painted in the colours somebody approved.
   */
  if (card.accent) config.themeOverrides = withAccent(config.themeOverrides, card.accent);

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
