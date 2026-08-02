import "server-only";

/**
 * The dataset source switch.
 *
 * Everything above this module — the route handlers, and through them the whole
 * client — speaks the PUBLISHED shape. Only this file knows whether the bytes
 * came off the local pack or out of Cloudflare R2, which is why swapping the whole
 * storage provider was a change to two modules rather than a rewrite of the client.
 *
 * THE SWITCH IS WHETHER A PACK IS ON DISK, not `NODE_ENV` and not whether
 * credentials exist. Credentials are the wrong signal — they are set in
 * development too, and keying on them would silently move local work onto
 * whatever was last published. The pack is
 * gitignored, so it is present exactly where it should win (a checkout someone
 * packed) and absent exactly where it must not (any deployment).
 *
 * `LEADS_DATASET_SOURCE=r2` forces the published path locally, which is how a
 * publish gets verified before it is committed.
 */

import type { ChurchRecord, IndexRow } from "@/lib/leads/engine/types";
import { havePack, type AssetKind } from "@/lib/leads/pack/read.ts";
import {
  r2Asset,
  r2ChurchCount,
  r2Index,
  r2IndexGz,
  r2PublishId,
  r2Record,
} from "./r2-source";
import {
  packAsset,
  packChurchCount,
  packIndex,
  packIndexGz,
  packPublishId,
  packRecord,
} from "./pack-source";

export type DatasetSource = "pack" | "r2";

function chooseSource(): DatasetSource {
  const forced = process.env.LEADS_DATASET_SOURCE;
  if (forced === "r2" || forced === "pack") return forced;
  return havePack() ? "pack" : "r2";
}

export const SOURCE: DatasetSource = chooseSource();

export interface DatasetPointer {
  publish_id: string;
  n_churches: number;
  /** Where the client fetches the index. Same URL shape whichever source wins. */
  index_url: string;
  source: DatasetSource;
}

/**
 * The pointer the client polls. Cheap and `no-store`: it is the ONE mutable thing
 * in the data path, and everything it points at is immutable.
 *
 * It no longer reads the index to answer "how many churches". That cost a 12.6 MB
 * parse every thirty seconds per open tab, to return a number the pack and the
 * publish receipt both already state.
 */
export async function getCurrent(): Promise<DatasetPointer> {
  const publish_id = SOURCE === "r2" ? r2PublishId() : await packPublishId();
  const n_churches = SOURCE === "r2" ? r2ChurchCount() : await packChurchCount();
  return {
    publish_id,
    n_churches,
    index_url: `/api/leads/index?publish=${encodeURIComponent(publish_id)}`,
    source: SOURCE,
  };
}

/**
 * The gzip bytes, unparsed.
 *
 * The index route serves these straight through with `Content-Encoding: gzip`.
 * Parsing 12.6 MB of JSON server-side only to re-serialize it was the single
 * largest thing in the request path, and neither end needed it: the browser
 * parses the index either way.
 */
export async function getIndexGz(): Promise<Buffer> {
  return SOURCE === "r2" ? r2IndexGz() : packIndexGz();
}

/** Parsed rows, for the routes that read the index rather than forward it. */
export async function getIndex(): Promise<IndexRow[]> {
  return SOURCE === "r2" ? r2Index() : packIndex();
}

export async function getRecord(orgId: string): Promise<ChurchRecord | null> {
  return SOURCE === "r2" ? r2Record(orgId) : packRecord(orgId);
}

export async function getAsset(kind: AssetKind, name: string): Promise<Buffer | null> {
  return SOURCE === "r2" ? r2Asset(kind, name) : packAsset(kind, name);
}
