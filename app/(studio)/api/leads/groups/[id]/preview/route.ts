import { getUserId } from "@/lib/leads/server/userId";
import { readGroup } from "@/lib/leads/server/groups";
import { getRecord } from "@/lib/leads/server/dataset";
import { isSafeGroupId } from "@/lib/leads/engine/group-types";
import { extrasOf, paletteFieldsOf } from "@/lib/leads/engine/demo-export";
import { logoOptionsOf, type LogoOption } from "@/lib/leads/engine/logo";
import { mapTheme } from "@/lib/generateDemo";
import type { ThemeOverrides } from "@/lib/types";

/**
 * GET /api/leads/groups/<id>/preview
 *
 * The two things about a batch that come from the LIVE record rather than from
 * the frozen snapshot: the colours every church will be painted with, and the
 * logos each one could be built with.
 *
 * WHY THESE ARE A REQUEST AT ALL. A batch entry is a frozen snapshot, and the
 * snapshot deliberately does not carry either — `ChurchSnapshot` holds the logo's
 * sha and plate theme and nothing else about colour or candidates. That is not an
 * oversight: the export reads the ramp LIVE, on the stated ground that a reviewer
 * never sees it and so has nothing to freeze. A preview built from the snapshot
 * would therefore be a preview of a different demo than the one that gets built.
 *
 * THE LOGO OPTIONS INVERT HALF OF THAT ARGUMENT, WHICH IS WHY THEY LIVE HERE AND
 * THE CHOICE DOES NOT. A reviewer does see the candidates and does choose one, so
 * the CHOICE is stored on the entry (`EntryEdits.logoPick`) where it is frozen
 * like every other correction. The MENU is not a claim about the church — it is a
 * list of images we happen to hold — so reading it live costs nothing and means
 * every batch collected before the alternatives existed gains the picker instead
 * of being stuck with a snapshot that predates them.
 *
 * ONE REQUEST FOR THE WHOLE BATCH, and one record read per church for BOTH
 * answers. Twenty cards mounting twenty fetches is twenty round trips to paint
 * decoration, and they would race the review the page exists for; asking twice
 * for the same record would double the reads for the same reason.
 *
 * THE PALETTE ANSWER IS `mapTheme`'s, NOT THIS ROUTE'S. Everything here is
 * plumbing: read the record, build the six colour fields with `paletteFieldsOf`,
 * hand them to the same function `generateDemo` calls. A `null` means the demo
 * really will fall back to the studio's default theme, which is a fact worth
 * showing rather than a blank to hide.
 *
 * THIS ROUTE WAS `/palette`. It was renamed rather than joined by a sibling
 * because a second route would have read every record a second time.
 *
 * WHICH IS ALSO WHY THE COLOURS ARE NOW PER OPTION. Each candidate logo carries
 * its own ramp, measured from its own pixels, so switching the logo repaints the
 * demo. Resolving all of them in this one pass means the card can show the
 * consequence of a choice at the moment it is made, instead of after an export.
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

export async function GET(_req: Request, ctx: RouteContext<"/api/leads/groups/[id]/preview">) {
  const userId = await getUserId();
  if (!userId) return bad("No identity cookie. Reload to obtain one.", 401);

  const { id } = await ctx.params;
  if (!isSafeGroupId(id)) return bad("Not a group id", 404);

  const group = await readGroup(userId, id);
  if (!group) return bad(`No batch named ${id}`, 404);

  const palettes: Record<string, ThemeOverrides | null> = {};
  const logoOptions: Record<string, LogoOption[]> = {};

  const entries = group.entries;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    await Promise.all(
      entries.slice(i, i + CONCURRENCY).map(async (entry) => {
        // A departed church has no record, no palette and no alternatives. It
        // still gets both keys, so the card can say "default theme" and "no other
        // options" rather than sit in a spinner.
        const record = await getRecord(entry.orgId).catch(() => null);
        palettes[entry.orgId] = mapTheme(paletteFieldsOf(extrasOf(record))) ?? null;
        /**
         * OURS COMES FROM THE SNAPSHOT, not from `resolve()`.
         *
         * The list is "every image this church could be represented by", and it
         * must not change shape because somebody already switched — otherwise the
         * option they chose last would vanish from the menu the moment it became
         * the current one, and there would be no way back to the pipeline's pick.
         */
        logoOptions[entry.orgId] = logoOptionsOf(entry.snapshot.logo, record).map((o) => ({
          ...o,
          /**
           * EACH OPTION'S OWN COLOURS, RESOLVED HERE.
           *
           * `mapTheme` is the function `generateDemo` calls, and running it on
           * the server per option is what lets the card repaint the instant a
           * reviewer picks — with the real answer rather than an approximation
           * of it, and without a second request per click. Three options a
           * church, twenty churches: sixty calls to a pure function, against the
           * one record read this loop already did.
           *
           * The raw 27-key palette is NOT sent. The client needs the twelve
           * resolved tokens; the measurement metadata behind them is ours.
           */
          colors: mapTheme(paletteFieldsOf(extrasOf(record, o.sha))) ?? null,
        }));
      }),
    );
  }

  return Response.json(
    { palettes, logoOptions },
    // Same window the single-record route uses. Neither answer changes except on
    // a republish, and a reviewer reloading a batch twice in a minute is reading,
    // not waiting for colours to move.
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
