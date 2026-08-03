import "server-only";
import { r2Delete, r2Env, r2Get, r2List, r2Put } from "@/lib/r2.ts";
import {
  makeExportGroupId,
  membershipFrom,
  nextBatchName,
  statusOf,
} from "@/lib/leads/engine/group.ts";
import { GROUP_SCHEMA_VERSION, isSafeGroupId } from "@/lib/leads/engine/group-types.ts";
import type {
  ExportGroup,
  ExportGroupSummary,
  Membership,
} from "@/lib/leads/engine/group-types.ts";

/**
 * Export groups on Cloudflare R2 — one object per group, under the owning user.
 *
 *   state/leads/groups/<userId>/<groupId>.json    the group
 *   state/leads/groups/<userId>/index.json        summaries, for the picker
 *
 * WHY `state/`, AND WHY THE SAME BUCKET AS THE CORPUS. `R2_BUCKET_DATA` is the
 * bucket that can never be made public — public access in R2 is a per-bucket
 * setting, and these objects carry frozen church snapshots with names, emails and
 * phone numbers. Sharing it with the corpus means no third bucket and no new
 * environment variable for whoever owns production. The publish script lists by
 * `<publish_id>/`, so it never sees `state/` and can never sweep it.
 *
 * WHY NOT VERCEL BLOB, WHICH THIS REPLACED. Not size — shape. Blob's Hobby tier
 * allows 2,000 "advanced operations" a month, and this module alone spends a
 * `list()` on a cold page load plus two `put()`s per 1.5s autosave. A session
 * reviewing twenty churches is 40+; two people working daily is ~1,760 against a
 * limit of 2,000, and exceeding it suspends the store for ~30 days rather than
 * billing for it. R2's equivalent budget is 1,000,000 a month.
 *
 * NOT THE SAME THING as `lib/groups.ts`. That module owns demo-generation groups
 * at the `groups/` prefix, keyed by demo slug. These are lead-console export
 * groups, keyed by `org_id`. The two will meet when the export button is wired to
 * demo generation; until then, keeping them apart is what stops one from being
 * read as the other.
 *
 * THE RULE THIS FILE IMPLEMENTS (`docs/05-SHARED-STATE.md`): every mutable object
 * has exactly one logical writer, chosen by putting the writer's identity in the
 * KEY. `userId` here always comes from `requireUserId()`, never from a request
 * body, or the invariant is decoration.
 *
 * There is no compare-and-swap here. Writes are full-object overwrites, which
 * makes them idempotent and a retry free.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * READ-AFTER-WRITE IS AVAILABLE HERE, AND THAT IS WHY THIS FILE IS SHORTER.
 *
 * This module used to carry a 120-second write-through cache pinned to
 * `globalThis`, because on the previous store writing a group and immediately
 * reading it back returned the PREVIOUS contents for about ten seconds —
 * measured, five overwrites 300ms apart all reading back as the first. With a
 * 1.5s autosave that was a data-loss path straight through the middle of the
 * feature: a PATCH folds operations into whatever it reads, so two flushes
 * inside the window both read the same old group and the second wrote over the
 * first. The cache existed to paper over that, and the summary index needed the
 * same treatment because there the lag DELETED things — create two groups a
 * second apart and the second one's rebuild read an index that did not mention
 * the first.
 *
 * R2 is strongly consistent: a PUT that returns has been persisted, and the next
 * GET sees it. So the cache, the `FRESH_MS` window, the `globalThis` pinning and
 * the rev-reconciliation that arbitrated between a remembered copy and a stale
 * stored one are all gone. Deleting a safety mechanism is only safe when the
 * hazard it guarded is gone rather than merely quiet — see the two-tab check in
 * the plan's verification list, which is what proved it.
 * ────────────────────────────────────────────────────────────────────────────
 */

const ROOT = "state/leads/groups";

/** Read per call, never hoisted: `r2Env()` is lazy so a build without
 *  credentials does not fail at module load. */
const bucket = () => r2Env().data;

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
 * `null` means NOT THERE. Anything else throws, deliberately.
 *
 * The Blob version swallowed every failure into `null`, and the route above
 * turns `null` into a 404 — so a transient storage blip told a reviewer their
 * batch did not exist, mid-edit, with a PATCH full of their typing in hand. A
 * thrown error becomes a 500, which the client retries. "Gone" and "could not
 * ask" are different answers and only one of them is recoverable.
 *
 * A parse failure throws for the same reason: a truncated group is damage to
 * look at, not an absence to paper over by writing a fresh one on top.
 */
async function readJson<T>(key: string): Promise<T | null> {
  const bytes = await r2Get(bucket(), key);
  if (!bytes) return null;
  return JSON.parse(bytes.toString("utf8")) as T;
}

/** The index is DERIVED — losing it costs a slower list, not a group — so its
 *  readers degrade to "rebuild" instead of propagating. */
async function readJsonOrNull<T>(key: string): Promise<T | null> {
  try {
    return await readJson<T>(key);
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  const body = JSON.stringify(value, null, 2) + "\n";
  const bytes = Buffer.byteLength(body, "utf8");
  if (bytes > MAX_BYTES) {
    // Loud, not silent. The caller surfaces this; the alternative is a group
    // that looks saved and is not.
    throw new Error(
      `groups: ${key} is ${(bytes / 1e6).toFixed(1)} MB, over the ${MAX_BYTES / 1e6} MB limit. ` +
        `Split the group rather than losing edits.`,
    );
  }
  if (bytes > WARN_BYTES) {
    console.warn(`leads/groups: ${key} is ${(bytes / 1e6).toFixed(2)} MB — approaching the limit`);
  }
  // `no-store` (the r2Put default): this is the mutable half of the bucket, and
  // nothing may serve a reviewer a revision older than the one they just saved.
  await r2Put(bucket(), key, body, "application/json");
}

export function summarize(g: ExportGroup): ExportGroupSummary {
  return {
    id: g.id,
    name: g.name,
    // `statusOf` collapses BOTH legacy spellings — absent (written before
    // batches existed) and the retired `"closed"` — onto `open`. One function,
    // because a batch that reads finished on the index and collectable on the
    // review page is a disagreement nobody can resolve by looking.
    status: statusOf(g),
    demoGroupId: g.demoGroupId,
    count: g.entries.length,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export async function readGroup(userId: string, groupId: string): Promise<ExportGroup | null> {
  if (!isSafeGroupId(groupId)) return null;
  return readJson<ExportGroup>(keyFor(userId, groupId));
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
  await writeJson(keyFor(userId, group.id), group);
  await refreshIndex(userId, group);
}

/**
 * Rebuild the summary index around one changed or removed group.
 *
 * Read-modify-write, which is only correct because the read sees the last write.
 * On the previous store it did not: create two groups a second apart and the
 * second one's rebuild read an index that did not mention the first, then wrote
 * an index containing only itself — a real group vanishing from the picker.
 */
async function refreshIndex(userId: string, changed: ExportGroup | null, removedId?: string) {
  const current = (await readJsonOrNull<ExportGroupSummary[]>(indexKey(userId))) ?? [];
  let next = current.filter((s) => s.id !== changed?.id && s.id !== removedId);
  if (changed) next = [summarize(changed), ...next];
  next.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
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
  const cached = await readJsonOrNull<ExportGroupSummary[]>(indexKey(userId));
  if (cached) return cached;

  let keys: string[];
  try {
    keys = await r2List(bucket(), `${ROOT}/${userId}/`);
  } catch {
    return [];
  }
  const groups = await Promise.all(
    keys
      .filter((k) => k.endsWith(".json") && !k.endsWith("/index.json"))
      // Tolerant: one unreadable group must not take the whole picker down with
      // it, because this is the fallback that runs when the index is already
      // gone. It drops out of the list and the next write puts it back.
      .map((k) => readJsonOrNull<ExportGroup>(k)),
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

/**
 * `Aug 2`, or `Aug 2 · 2` when that day already has one. Renameable either way.
 * The rule is `nextBatchName` in the engine, where it is pure and tested.
 */
async function batchName(userId: string, now: Date): Promise<string> {
  return nextBatchName(
    (await listGroups(userId)).map((s) => s.name),
    now,
  );
}

/**
 * The batch ✆ collects into, created on demand.
 *
 * A person never makes a group: they start collecting, and the group is what
 * that turns out to have been. So the first click on an empty console lands
 * here, and the newest open batch — or a fresh one — comes back.
 *
 * Find-or-create is not atomic — nothing here takes a lock. Strong consistency
 * shrinks the window to the genuine simultaneous case (two ✆ clicks landing in
 * flight together), and the fallback if that ever happens is two open batches,
 * which the picker shows and a person can merge or delete. That is strictly
 * better than blocking the most-pressed button in the console on a lock.
 */
export async function openGroup(userId: string, now = new Date()): Promise<ExportGroup> {
  const current = await currentGroupId(userId);
  if (current) {
    const g = await readGroup(userId, current);
    if (g) return g;
  }
  // "" — `startBatch` applies the naming rule, so there is one caller of it.
  return startBatch(userId, "", now);
}

/* ------------------------------------------------------------------ *
 * The current batch pointer
 * ------------------------------------------------------------------ */

const currentKey = (userId: string) => `${ROOT}/${userId}/current.json`;

/**
 * WHICH BATCH getting collected into — one small object, and the only writer of it.
 *
 * This used to be DERIVED: "the batch whose status is open", kept unique by
 * closing every other one whenever a new batch started. That worked, and it cost
 * a state — `closed` — whose only job was to make the derivation possible. A
 * batch you had merely stopped adding to looked finished, and the owner
 * reasonably objected to a button that made it look that way.
 *
 * Storing the pointer instead is what let `closed` be deleted. It is deliberately
 * SERVER-side rather than a per-browser selection: two tabs, or a laptop and a
 * phone, have to agree about where a church just went.
 *
 * READ IT THROUGH `currentGroupId`, never raw. The stored id can name a batch
 * that has since been deleted or exported, and resolving that is the whole point.
 */
async function readPointer(userId: string): Promise<string | null> {
  const raw = await readJsonOrNull<{ id?: unknown }>(currentKey(userId));
  return isSafeGroupId(raw?.id) ? raw.id : null;
}

async function writePointer(userId: string, id: string | null): Promise<void> {
  await writeJson(currentKey(userId), { id });
}

/**
 * The pointer, VALIDATED against what actually exists.
 *
 * Falls back to the newest batch that can still take churches, which is what
 * makes this change invisible to every batch collected before the pointer
 * existed — there is no migration and nothing to backfill. It resolves to `null`
 * only when every batch has been exported, and then the next collect correctly
 * starts a fresh one.
 */
export async function currentGroupId(userId: string): Promise<string | null> {
  const summaries = await listGroups(userId);
  const collectable = summaries.filter((s) => s.status !== "exported");
  const pointed = await readPointer(userId);
  if (pointed && collectable.some((s) => s.id === pointed)) return pointed;
  // `listGroups` is already sorted by `updatedAt`, newest first.
  return collectable[0]?.id ?? null;
}

/**
 * Begin a new batch and start collecting into it.
 *
 * IT NO LONGER CLOSES THE PREVIOUS ONE. It used to have to: the collect target was
 * found by scanning for the single open batch, so a second open batch made the
 * answer arbitrary. The pointer answers that question directly now, which makes
 * starting a batch ADDITIVE — the one you were on stays exactly as collectable as
 * it was, and the picker can switch back to it.
 */
export async function startBatch(
  userId: string,
  /** Empty means "name it for me" — the same rule ✆ uses. See `nextBatchName`. */
  name: string,
  now = new Date(),
): Promise<ExportGroup> {
  const iso = now.toISOString();
  const finalName = name.trim() || (await batchName(userId, now));

  const group: ExportGroup = {
    schema: GROUP_SCHEMA_VERSION,
    id: makeExportGroupId(finalName, now.getTime().toString(36).slice(-5)),
    userId,
    name: finalName,
    status: "open",
    createdAt: iso,
    updatedAt: iso,
    rev: 0,
    entries: [],
  };
  await writeGroup(userId, group);
  await writePointer(userId, group.id);
  return group;
}

/**
 * Point the collect target at an existing batch.
 *
 * ONE WRITE, and it touches no batch. This used to flip statuses — mark the
 * target open, close everything else — so switching rewrote up to N group objects
 * and stamped `updatedAt` on work nobody had touched. Moving a pointer says the
 * same thing and rewrites no history.
 *
 * An exported batch can never become the target. It has been sent, and collecting
 * more churches into it would make its own record of what went out a lie.
 */
export async function setCurrentGroup(userId: string, groupId: string): Promise<ExportGroup> {
  const target = await readGroup(userId, groupId);
  if (!target) throw new Error(`groups: no batch named ${groupId}`);
  if (statusOf(target) === "exported") {
    throw new Error("That batch has already been sent, so nothing more can be collected into it.");
  }
  await writePointer(userId, groupId);
  return target;
}

/**
 * Mark a batch sent, and remember what it produced.
 *
 * The pointer is cleared ONLY IF it named this batch. That is the owner's rule —
 * exporting leaves nothing selected and the next collect starts a fresh batch —
 * but clearing it unconditionally would yank the target out from under somebody
 * who exported an older batch while collecting into a different one.
 */
export async function markExported(
  userId: string,
  groupId: string,
  demoGroupId: string,
): Promise<ExportGroup> {
  const target = await readGroup(userId, groupId);
  if (!target) throw new Error(`groups: no batch named ${groupId}`);

  const iso = new Date().toISOString();
  const next: ExportGroup = {
    ...target,
    status: "exported",
    demoGroupId,
    exportedAt: iso,
    updatedAt: iso,
    rev: (target.rev ?? 0) + 1,
  };
  await writeGroup(userId, next);
  if ((await readPointer(userId)) === groupId) await writePointer(userId, null);
  return next;
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
  return membershipFrom(
    groups.filter((g): g is ExportGroup => g !== null),
    await currentGroupId(userId),
  );
}

/**
 * Remove a group's object. No-op if it is already gone.
 *
 * One DELETE by key. The Blob version had to `list()` first because `del` took a
 * URL rather than a path, so deleting one batch cost two operations and a
 * round trip to learn something it already knew.
 */
export async function removeGroup(userId: string, groupId: string): Promise<void> {
  try {
    await r2Delete(bucket(), keyFor(userId, groupId));
  } catch {
    /* already gone, or storage is unhappy — the index refresh below is what the
       picker actually reads, so still drop it from there. */
  }
  await refreshIndex(userId, null, groupId);
}
