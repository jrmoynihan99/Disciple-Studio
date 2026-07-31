import "server-only";

/**
 * The dataset source switch.
 *
 * Everything above this module — the route handlers, and through them the whole
 * client — speaks the PUBLISHED shape. Only this file knows whether the bytes
 * came off the local fixture or out of Vercel Blob, which is what makes the M5
 * cutover a change to one module instead of a rewrite of the client.
 */

import type { ChurchRecord, IndexRow } from "@/lib/leads/engine/types";
import {
  fixtureAsset,
  fixtureIndex,
  fixturePublishId,
  fixtureRecord,
} from "./fixture";

export interface DatasetPointer {
  publish_id: string;
  n_churches: number;
  /** Where the client fetches the index. Same URL shape as a real publish. */
  index_url: string;
  source: "fixture" | "blob";
}

/**
 * The pointer the client polls. Cheap and `no-store`: it is the ONE mutable
 * thing in the data path, and everything it points at is immutable.
 */
export async function getCurrent(): Promise<DatasetPointer> {
  const rows = await fixtureIndex();
  const publish_id = await fixturePublishId();
  return {
    publish_id,
    n_churches: rows.length,
    index_url: `/api/leads/index?publish=${encodeURIComponent(publish_id)}`,
    source: "fixture",
  };
}

export async function getIndex(): Promise<IndexRow[]> {
  return fixtureIndex();
}

export async function getRecord(orgId: string): Promise<ChurchRecord | null> {
  return fixtureRecord(orgId);
}

export async function getAsset(
  kind: "logos" | "logos-thumb",
  name: string,
): Promise<Buffer | null> {
  return fixtureAsset(kind, name);
}
