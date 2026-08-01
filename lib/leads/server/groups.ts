import "server-only";
import { list, put, del, get } from "@vercel/blob";
import { fresherGroup, makeExportGroupId, membershipFrom } from "@/lib/leads/engine/group.ts";
import { GROUP_SCHEMA_VERSION, isSafeGroupId } from "@/lib/leads/engine/group-types.ts";
import type {
  ExportGroup,
  ExportGroupSummary,
  Membership,
} from "@/lib/leads/engine/group-types.ts";

/**
 * Export groups on Vercel Blob — one blob per group, under the owning user.
 *
 *   leads/groups/<userId>/<groupId>.json    the group
 *   leads/groups/<userId>/index.json        summaries, for the picker
 *
 * NOT THE SAME THING as `lib/groups.ts`. That module owns demo-generation groups
 * at the `groups/` prefix, keyed by demo slug. These are lead-console export
 * groups at `leads/groups/`, keyed by `org_id`. The two will meet when the export
 * button is wired to demo generation; until then, keeping them apart is what
 * stops one from being read as the other.
 *
 * THE RULE THIS FILE IMPLEMENTS (`docs/05-SHARED-STATE.md`): every mutable blob
 * has exactly one logical writer, chosen by putting the writer's identity in the
 * KEY. `userId` here always comes from `requireUserId()` — the verified cookie —
 * never from a request body, or the invariant is decoration.
 *
 * There is no compare-and-swap. Blob does not offer one, and its overwrites can
 * take up to ~60s to clear the CDN, so a read-compare-write guard would fail in
 * exactly the case it was built for. Writes are full-blob overwrites, which makes
 * them idempotent and a retry free.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * READ-AFTER-WRITE IS NOT AVAILABLE HERE. THIS IS MEASURED, NOT ASSUMED.
 *
 * Writing a group and immediately reading it back returns the PREVIOUS contents
 * for about ten seconds. Measured against this store: five overwrites 300ms
 * apart all read back as the first one. `cacheControlMaxAge: 0` does not prevent
 * it, a `cache-control: no-cache` request header does not prevent it, and the
 * blob is private so there is no URL to cache-bust.
 *
 * That is not a curiosity — it is a data-loss path straight through the middle
 * of this feature. A PATCH folds operations into whatever it reads, so two
 * flushes inside the window would both read the same old group and the second
 * would write over the first. At a 1.5s autosave debounce, that is every
 * ordinary editing session.
 *
 * So this module keeps a WRITE-THROUGH CACHE of what it last wrote, and prefers
 * it over a blob read that comes back older. The cache is authoritative for
 * exactly as long as the lag lasts, and only for a key this process wrote —
 * which is sound precisely because of the single-writer rule above.
 * ────────────────────────────────────────────────────────────────────────────
 */

const ACCESS = "private" as const;
const ROOT = "leads/groups";

/** Warn here, fail above the next one. Never truncate — a silently dropped edit
 *  is the worst outcome this system has. */
const WARN_BYTES = 1_000_000;
const MAX_BYTES = 4_000_000;

/** The shape `identity.ts` mints and verifies. Checked again because the value
 *  is about to become a storage path segment. */
const SAFE_USER_ID = /^u_[0-9a-f]{16}$/;

function keyFor(userId: string, groupId: string): string {
  if (!SAFE_USER_ID.test(userId)) throw new Error("groups: refusing an unrecognised user id");
  if (!isSafeGroupId(groupId)) throw new Error("groups: refusing an unsafe group id");
  return `${ROOT}/${userId}/${groupId}.json`;
}

function indexKey(userId: string): string {
  if (!SAFE_USER_ID.test(userId)) throw new Error("groups: refusing an unrecognised user id");
  return `${ROOT}/${userId}/index.json`;
}

/**
 * What we last wrote, per key.
 *
 * Comfortably longer than the ~10s lag measured above, and short enough that a
 * long-lived process cannot drift far from storage. Entries are replaced on
 * every write, so this never grows past the number of groups in play.
 */
const FRESH_MS = 120_000;

/**
 * Pinned to `globalThis`, not to module scope.
 *
 * Route handlers do not share one module instance — in dev each route gets its
 * own graph, and a hot reload replaces it. Measured: a group written by
 * `/api/leads/groups/[id]/churches` was invisible to the cache in
 * `/api/leads/groups`, so the picker kept showing a stale count of 0 for a group
 * that had a church in it. A module-level Map fixes the route that writes it and
 * nothing else. This is the same reason the Prisma-client-on-globalThis pattern
 * exists.
 */
interface GroupCache {
  groups: Map<string, { group: ExportGroup; at: number }>;
  index: Map<string, { summaries: ExportGroupSummary[]; at: number }>;
}

const cache: GroupCache = ((globalThis as { __leadGroupCache?: GroupCache }).__leadGroupCache ??= {
  groups: new Map(),
  index: new Map(),
});

const recent = cache.groups;

function remember(pathname: string, group: ExportGroup) {
  recent.set(pathname, { group, at: Date.now() });
}

/**
 * Prefer what we wrote over what the store admits to, while the store is behind.
 *
 * `rev` decides, not recency: if the blob comes back with a rev at least as high
 * as ours, someone else has written and their copy wins. Ours is only used to
 * paper over the store lagging behind THIS process.
 */
function reconcile(pathname: string, stored: ExportGroup | null): ExportGroup | null {
  const { group, expired } = fresherGroup(stored, recent.get(pathname), Date.now(), FRESH_MS);
  if (expired) recent.delete(pathname);
  return group;
}

async function readJson<T>(pathname: string): Promise<T | null> {
  try {
    const result = await get(pathname, { access: ACCESS });
    if (!result?.stream) return null;
    return (await new Response(result.stream).json()) as T;
  } catch {
    return null;
  }
}

async function writeJson(pathname: string, value: unknown): Promise<void> {
  const body = JSON.stringify(value, null, 2) + "\n";
  const bytes = Buffer.byteLength(body, "utf8");
  if (bytes > MAX_BYTES) {
    // Loud, not silent. The caller surfaces this; the alternative is a group
    // that looks saved and is not.
    throw new Error(
      `groups: ${pathname} is ${(bytes / 1e6).toFixed(1)} MB, over the ${MAX_BYTES / 1e6} MB limit. ` +
        `Split the group rather than losing edits.`,
    );
  }
  if (bytes > WARN_BYTES) {
    console.warn(`leads/groups: ${pathname} is ${(bytes / 1e6).toFixed(2)} MB — approaching the limit`);
  }
  await put(pathname, body, {
    access: ACCESS,
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    // So a just-saved group reads back immediately rather than serving the
    // previous revision to the tab that wrote it.
    cacheControlMaxAge: 0,
  });
}

export function summarize(g: ExportGroup): ExportGroupSummary {
  return {
    id: g.id,
    name: g.name,
    // Groups written before batches existed carry no status. They are open —
    // nothing has ever been exported, because the export does not exist yet.
    status: g.status ?? "open",
    count: g.entries.length,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export async function readGroup(userId: string, groupId: string): Promise<ExportGroup | null> {
  if (!isSafeGroupId(groupId)) return null;
  const pathname = keyFor(userId, groupId);
  return reconcile(pathname, await readJson<ExportGroup>(pathname));
}

/**
 * Write the group, then refresh the summary index.
 *
 * Order matters: the group is the truth and the index is a convenience, so a
 * crash between the two leaves a real group missing from a list rather than a
 * listed group that does not exist. `listGroups` rebuilds from storage when the
 * index is absent, which closes the gap on the next read.
 */
export async function writeGroup(userId: string, group: ExportGroup): Promise<void> {
  const pathname = keyFor(userId, group.id);
  await writeJson(pathname, group);
  // Only after the write succeeds. Remembering a group we failed to store would
  // serve edits that do not exist anywhere.
  remember(pathname, group);
  await refreshIndex(userId, group);
}

/**
 * The summary index lags too, and here the lag DELETES things.
 *
 * Create two groups a second apart and the second one's rebuild reads an index
 * that does not mention the first — so it writes an index containing only
 * itself, and a real group vanishes from the list. Hence the same
 * remembered-copy rule: merge into what we last wrote when the store is behind.
 */
const recentIndex = cache.index;

async function currentIndex(userId: string): Promise<ExportGroupSummary[]> {
  const mine = recentIndex.get(userId);
  if (mine && Date.now() - mine.at <= FRESH_MS) return mine.summaries;
  return (await readJson<ExportGroupSummary[]>(indexKey(userId))) ?? [];
}

async function refreshIndex(userId: string, changed: ExportGroup | null, removedId?: string) {
  const current = await currentIndex(userId);
  let next = current.filter((s) => s.id !== changed?.id && s.id !== removedId);
  if (changed) next = [summarize(changed), ...next];
  next.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  recentIndex.set(userId, { summaries: next, at: Date.now() });
  try {
    await writeJson(indexKey(userId), next);
  } catch {
    // The index is derived. Losing it costs a slower list, not a group.
  }
}

/**
 * Summaries, newest first.
 *
 * Reads one small blob. The fallback rebuilds by reading every group, which is
 * what `lib/groups.ts` does unconditionally — fine for a handful of small demo
 * groups, but an export group carries frozen snapshots and runs to hundreds of
 * kilobytes, so paying that on every picker open is not fine.
 */
export async function listGroups(userId: string): Promise<ExportGroupSummary[]> {
  const mine = recentIndex.get(userId);
  if (mine && Date.now() - mine.at <= FRESH_MS) return mine.summaries;

  const cached = await readJson<ExportGroupSummary[]>(indexKey(userId));
  if (cached) return cached;

  let blobs;
  try {
    ({ blobs } = await list({ prefix: `${ROOT}/${userId}/`, limit: 1000 }));
  } catch {
    return [];
  }
  const groups = await Promise.all(
    blobs
      .filter((b) => b.pathname.endsWith(".json") && !b.pathname.endsWith("/index.json"))
      .map((b) => readJson<ExportGroup>(b.pathname)),
  );
  const summaries = groups
    .filter((g): g is ExportGroup => g !== null)
    .map(summarize)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  try {
    await writeJson(indexKey(userId), summaries);
  } catch {
    /* best effort */
  }
  return summaries;
}

/* ------------------------------------------------------------------ *
 * The open batch
 * ------------------------------------------------------------------ */

/** `Aug 2` — the batch is named for the day it was started, and renameable. */
function batchName(now: Date): string {
  return now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * The batch ✆ collects into, created on demand.
 *
 * A person never makes a group: they start collecting, and the group is what
 * that turns out to have been. So the first click on an empty console lands
 * here, and the newest open batch — or a fresh one — comes back.
 *
 * Find-or-create is not atomic, and cannot be on a store with no
 * compare-and-swap. The write-through cache above closes the realistic window
 * (two clicks in the same process), and the fallback if two ever did race is two
 * open batches, which the picker shows and a person can merge or delete. That is
 * strictly better than blocking a click on a lock that cannot exist.
 */
export async function openGroup(userId: string, now = new Date()): Promise<ExportGroup> {
  const summaries = await listGroups(userId);
  const existing = summaries.find((s) => s.status === "open");
  if (existing) {
    const g = await readGroup(userId, existing.id);
    if (g) return g;
  }
  return startBatch(userId, batchName(now), now);
}

/**
 * Begin a new batch, closing whatever was being collected into.
 *
 * ONE open batch is an invariant, not a coincidence: ✆ has to know where a
 * church goes without asking. Creating a second open batch would make that
 * question ambiguous and the answer arbitrary (whichever the summary index
 * happened to list first).
 *
 * The previous batch is `closed`, never `exported` — nothing was sent.
 */
export async function startBatch(
  userId: string,
  name: string,
  now = new Date(),
): Promise<ExportGroup> {
  const iso = now.toISOString();

  for (const s of await listGroups(userId)) {
    if (s.status !== "open") continue;
    const prev = await readGroup(userId, s.id);
    if (prev) {
      await writeGroup(userId, {
        ...prev,
        status: "closed",
        closedAt: iso,
        updatedAt: iso,
        rev: (prev.rev ?? 0) + 1,
      });
    }
  }

  const group: ExportGroup = {
    schema: GROUP_SCHEMA_VERSION,
    id: makeExportGroupId(name, now.getTime().toString(36).slice(-5)),
    userId,
    name,
    status: "open",
    createdAt: iso,
    updatedAt: iso,
    rev: 0,
    entries: [],
  };
  await writeGroup(userId, group);
  return group;
}

/**
 * Which batches each collected church is in — IDS ONLY.
 *
 * The console fetches this on every load, and one group is ~210 KB, so the
 * payload must be proportional to what has been collected rather than to the
 * corpus. Nothing from a snapshot — no name, no quote, no contact — belongs
 * here; there is a test asserting exactly that, because this is the one group
 * response that is not behind a deliberate click.
 */
export async function membership(userId: string): Promise<Membership> {
  const summaries = await listGroups(userId);
  const groups = await Promise.all(summaries.map((s) => readGroup(userId, s.id)));
  return membershipFrom(groups.filter((g): g is ExportGroup => g !== null));
}

/** Remove a group's blob. No-op if it is already gone. */
export async function removeGroup(userId: string, groupId: string): Promise<void> {
  const pathname = keyFor(userId, groupId);
  // Forget it first: a remembered copy would keep serving a group that no longer
  // exists, for as long as the cache is fresh.
  recent.delete(pathname);
  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    const exact = blobs.find((b) => b.pathname === pathname);
    if (exact) await del(exact.url);
  } catch {
    /* already gone — treat as success */
  }
  await refreshIndex(userId, null, groupId);
}
