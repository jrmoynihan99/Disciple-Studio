# The lead corpus

15,274 churches. Everything the `/leads` console renders comes from here.

## Why the data is not in this repository

`Peashooter8890/Disciple-Studio` is **public**. The corpus carries staff names,
email addresses, phone numbers and postal addresses for 15,274 real
congregations. Committed once, it is in every clone and every fork forever, and
`git rm` does not remove it from history.

So the payload lives on **Cloudflare R2**, and what git holds is the *receipt*:
[`published.json`](published.json) names the exact build production must serve.
That file is deliberately free of church data — timestamps, counts and hashes
only.

Never relax [`.gitignore`](.gitignore) in this directory without checking the
file you are adding for church names, emails, phone numbers or `org_id`s.

## Why R2 and not Vercel Blob

Measured, not preferred. Vercel Blob's Hobby tier allows **2,000 "advanced
operations" a month**, and every `put()` is one. Publishing this corpus is
**14,511 objects** — about seven times the monthly budget in a single run. Doing
it suspended the store for ~30 days and took the demo pages and export batches
down with it, because they share it. Pro only raises the allowance to ~10,000,
still less than one publish, so no tier made it work.

R2 allows **1,000,000 writes and 10,000,000 reads a month**, charges nothing for
egress, and bills for overage rather than suspending. The publish is 1.5% of the
write allowance.

**Demo generation is still on Vercel Blob and should stay there.** Demo configs,
uploaded logos and import groups are ~121 small objects with a handful of writes
per demo, which is exactly what Blob is good at. The split is by shape, not by
vendor.

### Two buckets, and it is not cosmetic

R2's public access is a **per-bucket** setting.

| bucket | holds | public? |
|---|---|---|
| `R2_BUCKET_DATA` | `<publish_id>/index.json.gz`, `<publish_id>/records/<xx>.ndjson.gz` | **never** — names, emails, phone numbers |
| `R2_BUCKET_LOGOS` | `logos-thumb/<sha256>.webp` | may go behind a CDN — sha-named images identify nothing alone |

One bucket would mean that putting the logos on a CDN — the only reason to want
a custom domain — would publish the contact data with them. `leads-publish`
refuses to run if the two names are equal, and refuses to put a record in the
logos bucket.

**Logos are not keyed by publish.** The filename *is* the sha256, so identical
bytes are the same key forever: a republish uploads ~257 objects instead of
14,511, and a CDN URL stays valid across publishes.

## Layout

```
data/leads/
  README.md            this file
  published.json       committed. the build production serves
  index.schema.json    committed. the index contract
  .gitignore           allow-list; deny by default

  incoming/<build>/    ignored. the raw upstream drop, exactly as delivered
  pack/                ignored. the local artefact the app, the tests and the
                       publisher all read
```

### `incoming/<build>/`

Drop the upstream package here under its own name — `package-v2-final`, and
whatever supersedes it. Nothing reads it directly except the pack step, so old
builds can sit alongside new ones and be deleted when you are sure.

A package contains `MANIFEST.json`, `index.json.gz`, `records.ndjson.gz`,
`logos-thumb.tar` and a `dev-only/` folder. An incremental rebuild also ships
`DELTA.json` and `changed.ndjson.gz`; the pack step ignores both and reads the
full `records.ndjson.gz`, because a pack must be reproducible from one package
rather than from a chain of them.

### `pack/`

```
pack/
  publish.json               publish_id, built_at, n_churches, hashes
  index.json.gz              served to the browser as-is, ~2.6 MB
  records/<xx>.ndjson.gz     256 shards, keyed by sha256(org_id)[0:2]
  logos-thumb/<sha>.webp     14,254 thumbnails
  dev/                       golden-colors, vocab, index schema, edge cases —
                             test-only, never published
```

## Commands

```bash
npm run leads:pack                    # incoming/<newest> → pack/
npm run leads:pack -- --force         # rebuild even if the stamp matches
npm run leads:publish -- --dry-run    # what would upload, and how much
npm run leads:publish                 # upload + rewrite published.json
npm run leads:copy                    # regenerate docs/leads/copy-inventory.md
```

`leads:pack` verifies every record against its `MANIFEST` sha256 as it goes and
refuses to write a pack if one fails.

## Publishing, and why `published.json` is committed

`getCurrent()` reads `published.json` out of the deployment — not a mutable
pointer object. Three consequences, all wanted:

- The data version and the code version move together. A republish is a commit.
- There is no read-after-write window anywhere in the data path.
- Every key is derived from `publish_id`, so a republish writes new objects and
  can never overwrite what a running deployment is reading.

**Two accounts.** The publish script writes to whichever account the `R2_*`
variables point at. If someone else owns production, they run
`npm run leads:publish` once against their own credentials, commit the
`published.json` it emits, and deploy. Nothing here records an account-specific
URL — only keys and hashes, which are identical in every account.

Uploads go **index and records first, logos last**, so a run that dies partway
leaves the essential half in place rather than a bucket full of thumbnails and no
church data. The script re-lists the buckets afterwards and refuses to write the
receipt unless every object is really there.

If the deployment's `published.json` names a build the bucket does not hold, the
console fails on the first request with a message naming the missing key. It does
not render an empty list, which would look like "no churches matched".

## Verifying a publish before you commit it

```bash
LEADS_DATASET_SOURCE=r2 npm run dev
```

The app normally prefers `pack/` whenever it exists on disk, which is what keeps
local work off whatever was last published. This forces the published path so a
publish can be driven in a browser before its receipt is committed.

## Environment

See [`.env.example`](../../.env.example) for the full list with commentary.
Production needs:

| variable | what breaks without it |
|---|---|
| `STUDIO_USER` | defaults to `admin` |
| `STUDIO_PASSWORD` | `proxy.ts` fails closed — every gated route 401s |
| `LEADS_ID_SECRET` | **set it explicitly.** `identity.ts` falls back to `STUDIO_PASSWORD`, so user ids derive from the password — rotate it and every user's batches are orphaned |
| `R2_ACCOUNT_ID`, `R2_BUCKET_DATA`, `R2_BUCKET_LOGOS`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | no dataset. The preflight names whichever one is missing |
| `BLOB_READ_WRITE_TOKEN` | no demo generation and no export batches (still Vercel Blob) |

Locally none of the R2 variables are needed to *read* the corpus: with a `pack/`
on disk the app reads it from there. They are needed to publish. Set
`LEADS_PACK_DIR` to move the pack elsewhere.
