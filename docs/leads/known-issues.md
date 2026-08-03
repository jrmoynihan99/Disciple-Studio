# Known issues

Open items that are **known, understood and deliberately not fixed**. Nothing
here is breaking today; each one is recorded so the next person does not spend an
afternoon rediscovering it.

If you fix one, delete its section rather than marking it done — a list of
resolved items is a list nobody reads to the bottom of.

---

## 1 · 86 quotes in the corpus have no source page

**Status:** upstream data gap. Not fixable in this repository.
**Impact:** 86 quotes across 39 churches are withheld from the review sheet — 58
of them discipleship-pathway steps, in 17 of the 22 churches whose pathway ships
`source_url: ""`. Nothing is wrong on screen; those steps read *"no quotation
captured"*.

`/leads/audit` reports this, and it is the **one red line you should expect**:

```
every quote is traceable to a source URL — 140,129 quotes, 86 orphaned
```

**These numbers move with every package** — they were 63 of 82,499 when this was
written and the corpus has roughly doubled since. Re-measure before quoting them
back to the supplier; the ratio (~0.06%) has been the stable part.

**What it means.** The console may only show a church's own words if it can point
at the page it read them on — cite, or say nothing. For 21 churches the upstream
package shipped pathway steps whose `source_url` is `""`, with no page anywhere up
the tree, so there is nothing to point at.

**What the app does about it.** Withholds the quote and keeps the step, in
[`lib/leads/engine/snapshot.ts`](../../lib/leads/engine/snapshot.ts) (search
`CITE OR ABSTAIN, PER STEP`). This has always been the behaviour. The only thing
that changed recently is that the audit stopped hiding it — that check used to run
over an empty array and pass vacuously.

**Do not "fix" it by rendering the quote anyway.** It is a one-line change and it
is tempting, and it would not turn the audit green either: the check reads the raw
package, so the missing URL is still missing. It would only add lines to the proof
sheet that a reviewer **cannot check**, on a page whose whole purpose is
*open the site and verify this*.

**The real fix is upstream.** The supplier has the text and knows which page they
scraped it from — they just did not record it. Ask for `source_url` on every
pathway step. Then the quotes come back *and* they are checkable.

---

## 2 · `golden-colors.json` is stale

**Status:** upstream data. Report with item 1.

The `dev/golden-colors.json` table pins the expected verdict colour for every
question on every church, and the test suite checks against it. Question **q8 was
reworked for 11,591 churches**, but the package shipped a **byte-identical**
golden table — so the table now describes the previous behaviour for those rows.

It is quarantined rather than trusted; the arithmetic was checked and the mismatch
accounts for q8 alone. Ask the supplier to regenerate the table in the same run
that changes an answer, not separately.

---

## 3 · `/leads/audit` takes ~130 seconds

**Status:** working as intended, just slow. Not a bug.

The corpus sweep fetches all 15,273 records one request at a time, ~13 ms each. It
is bounded to 16 in flight and folds each record as it arrives rather than
collecting them, so it neither crashes the tab nor eats several hundred MB — but
it is still 15,273 round trips.

If it ever needs to be faster, the fix is a bulk endpoint returning many records
per request; the per-request overhead is the whole cost, not the data. Not worth
doing until somebody is actually waiting on it.

---

## 4 · Existing demo logos in Vercel Blob are not content-addressed

**Status:** fixed going forward, old objects left alone.

Logo uploads used to get a random suffix, so re-importing the same demo wrote a
new object and orphaned the old one — and nothing in this codebase ever deletes a
logo (`deleteChurch` removes only the church config). They accumulated.

[`lib/logo.ts`](../../lib/logo.ts) now names each object by the sha256 of its own
bytes, so a re-import rewrites nothing. **Objects uploaded before that change keep
their old random-suffix names and still work** — nothing was renamed or deleted,
and the demos pointing at them are unaffected. There is no need to clean them up;
deleting them would cost more operations than leaving them.

---

## 5 · A just-exported demo can read back as 404 from `/api/churches/<slug>`

**Status:** the case that matters is already handled. The admin API is not.

`getChurch` reads **through the blob CDN**, which is eventually consistent, so a
demo written seconds ago can come back missing for a few seconds. It is written
down in [`churches/index.ts`](../../churches/index.ts) — search
`churchBlobExists`.

**`/c/<slug>` — the page a church actually opens — waits the window out**, using
`list()` (the store's own index, immediately consistent) to tell *written, not
visible yet* from *never existed*, so a crawler or a guessed URL still 404s fast.

**`/api/churches/<slug>`, the editor read, does a bare `getChurch`.** Fetch a demo
in the same breath as exporting it and you can get one 404 before it settles. It
is only reachable from `/admin` and by scripts, both of which are behind the
password and can retry, which is why it has not been given the patient path.

If you write a script that exports and then reads back, retry the read rather than
sleeping a fixed amount — the window is usually under a second and occasionally
several.
