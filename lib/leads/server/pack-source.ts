import "server-only";

/**
 * The local dataset source: read `data/leads/pack` off disk.
 *
 * This is what runs when no `BLOB_READ_WRITE_TOKEN` is set — development, and a
 * checkout someone is exploring. Production reads `blob-source.ts`. Both speak
 * the same four functions, which is what makes `dataset.ts` a switch rather than
 * two code paths.
 *
 * All of the substance is in `lib/leads/pack/read.ts`, which the tests import
 * too. This file exists to put `server-only` in front of it and to give the
 * async signatures the routes expect.
 */

import {
  havePack,
  PACK_DIR,
  readAsset,
  readIndex,
  readIndexGz,
  readPublish,
  readRecord,
  type AssetKind,
} from "@/lib/leads/pack/read.ts";
import type { ChurchRecord, IndexRow } from "@/lib/leads/engine/types";

/**
 * Fail loudly rather than 404 quietly. A missing pack is a misconfiguration, and
 * a silent empty console looks exactly like "no churches matched" — the one
 * failure mode nobody investigates.
 */
function assertPack() {
  if (!havePack()) {
    throw new Error(
      `leads: no pack at ${PACK_DIR}. Run \`npm run leads:pack\`, or set ` +
        `LEADS_PACK_DIR. (In production, set BLOB_READ_WRITE_TOKEN instead — see ` +
        `data/leads/README.md.)`,
    );
  }
}

export async function packPublishId(): Promise<string> {
  assertPack();
  return readPublish().publish_id;
}

export async function packChurchCount(): Promise<number> {
  assertPack();
  return readPublish().n_churches;
}

export async function packIndexGz(): Promise<Buffer> {
  assertPack();
  return readIndexGz();
}

export async function packIndex(): Promise<IndexRow[]> {
  assertPack();
  return readIndex();
}

export async function packRecord(orgId: string): Promise<ChurchRecord | null> {
  assertPack();
  return readRecord(orgId);
}

export async function packAsset(kind: AssetKind, name: string): Promise<Buffer | null> {
  assertPack();
  return readAsset(kind, name);
}
