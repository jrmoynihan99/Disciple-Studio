import { getUserId } from "@/lib/leads/server/userId";
import { readGroup } from "@/lib/leads/server/groups";
import { getRecord } from "@/lib/leads/server/dataset";
import { isSafeGroupId } from "@/lib/leads/engine/group-types";
import { extrasOf, paletteFieldsOf } from "@/lib/leads/engine/demo-export";
import { mapTheme } from "@/lib/generateDemo";
import type { ThemeOverrides } from "@/lib/types";

/**
 * GET /api/leads/groups/<id>/palette
 *
 * The colours every church in a batch will be painted with, resolved exactly as
 * the export will resolve them.
 *
 * WHY THIS IS A REQUEST AT ALL. A batch entry is a frozen snapshot, and the
 * snapshot deliberately does not carry the palette — `ChurchSnapshot` holds the
 * logo's sha and plate theme and nothing else about colour. That is not an
 * oversight: the export reads the ramp LIVE, on the stated ground that a reviewer
 * never sees it and so has nothing to freeze. A preview built from the snapshot
 * would therefore be a preview of a different demo than the one that gets built.
 *
 * ONE REQUEST FOR THE WHOLE BATCH, not one per card. Twenty cards mounting twenty
 * fetches is twenty round trips to paint decoration, and they would race the
 * review the page exists for. The reply is a few hundred bytes per church.
 *
 * THE ANSWER IS `mapTheme`'s, NOT THIS ROUTE'S. Everything here is plumbing: read
 * the record, build the six colour fields with `paletteFieldsOf`, hand them to
 * the same function `generateDemo` calls. A `null` means the demo really will
 * fall back to the studio's default theme, which is a fact worth showing rather
 * than a blank to hide.
 */

export const dynamic = "force-dynamic";

/**
 * How many records are read at once.
 *
 * A record is ~13 KB and a batch can hold forty churches, so the unbounded
 * version is forty simultaneous R2 gets fired to paint swatches — the console's
 * own rule is that a cosmetic request must never be the thing that rate-limits
 * the corpus out from under a reviewer.
 */
const CONCURRENCY = 6;

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function GET(_req: Request, ctx: RouteContext<"/api/leads/groups/[id]/palette">) {
  const userId = await getUserId();
  if (!userId) return bad("No identity cookie. Reload to obtain one.", 401);

  const { id } = await ctx.params;
  if (!isSafeGroupId(id)) return bad("Not a group id", 404);

  const group = await readGroup(userId, id);
  if (!group) return bad(`No batch named ${id}`, 404);

  const orgIds = group.entries.map((e) => e.orgId);
  const palettes: Record<string, ThemeOverrides | null> = {};

  for (let i = 0; i < orgIds.length; i += CONCURRENCY) {
    await Promise.all(
      orgIds.slice(i, i + CONCURRENCY).map(async (orgId) => {
        // A departed church has no record and no palette. It still gets a key,
        // so the card can say "default theme" rather than sit in a spinner.
        const record = await getRecord(orgId).catch(() => null);
        palettes[orgId] = mapTheme(paletteFieldsOf(extrasOf(record))) ?? null;
      }),
    );
  }

  return Response.json(
    { palettes },
    // Same window the single-record route uses. A palette changes only on a
    // republish, and a reviewer reloading a batch twice in a minute is reading,
    // not waiting for colours to move.
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
