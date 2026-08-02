# Known issues

Open items that are **known, understood and deliberately not fixed**. Nothing
here is breaking today; each one is recorded so the next person does not spend an
afternoon rediscovering it.

If you fix one, delete its section rather than marking it done — a list of
resolved items is a list nobody reads to the bottom of.

---

## 1 · 63 quotes in the corpus have no source page

**Status:** upstream data gap. Not fixable in this repository.
**Impact:** 59 discipleship-pathway quotes across 21 churches are withheld from
the review sheet. Nothing is wrong on screen; those steps read
*"no quotation captured"*.

`/leads/audit` reports this, and it is the **one red line you should expect**:

```
every quote is traceable to a source URL — 82,499 quotes, 63 orphaned
```

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

The corpus sweep fetches all 15,274 records one request at a time, ~13 ms each. It
is bounded to 16 in flight and folds each record as it arrives rather than
collecting them, so it neither crashes the tab nor eats several hundred MB — but
it is still 15,274 round trips.

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
