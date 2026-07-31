# What the scraper repo must publish

The contract between the scraper repo and the Disciple Studio Lead Console.

Everything here is derived from the console's own code and measured against the
134-church handoff fixture, not copied from a design doc. Where the two disagree
the code wins, and the disagreement is called out.

---

## 1 · Why the shape changes at all

A fully extracted church is ~13.3 KB of JSON. At 14,396 churches that is **~191 MB**,
and it cannot live in a browser.

But the thing that makes the console good — filtering, facet counts, favor
re-scoring and the histogram are *instant and computed over the whole corpus* —
requires every church to be available client-side. Server-side filtering would
move the favor engine into a query language and make every tuning keystroke a
round trip.

So the publish emits **two** views of every church:

| | what it is | size | when it loads |
|---|---|---|---|
| **slim index** | one short line per church | ~840 B raw · **~190 B gzipped** | once, on cold load — all 14,396 rows, ~2.6 MB gzipped |
| **full record** | everything, incl. every quote and URL | ~13.3 KB | only when a dossier opens |

Plus logos, which are served from our own store rather than hotlinked from each
church's CDN — hotlinking is ~2.3 MB of third-party images per 60-row page, it
breaks whenever a church redesigns, and it leaks our users' IP addresses to
every church.

---

## 2 · The rule that governs the whole index

> **The index must carry every field the COLOUR ENGINE, the FILTERS, the SORTS
> and the FAVOR SCORE consume — not merely the fields a row displays.**

This is the one that gets missed, and it has been missed three times already
(§5). The failure is silent and asymmetric: a field the row displays is obviously
missing when it is missing. A field only the *colour* depends on just makes the
church paint grey — which the interface legitimately uses to mean "we never
measured this."

So the bug does not look like a bug. It looks like an honest gap in the data,
which is exactly the thing this product exists to be trustworthy about.

**Symptom to watch for:** the list and the facet swatch paint one colour, the
dossier paints another, for the same church. If those two can disagree, the index
is incomplete.

**Corollary:** a field may be required in the index *and* invisible on the row.
`q4.cell` and `q6`'s verdict are both like this. Do not "clean up" a field
because nothing renders it.

---

## 3 · Per-question required fields

Short keys, because every user downloads this on cold load. `a` = answer.

| question | required | why the extra fields are needed |
|---|---|---|
| **q1** Pathway | `a` | fully table-driven |
| **q2** Staff | `a`, `c`, `fl`, **`uc`** | the colour bands on the count; `fl` renders `12+`, `uc` renders `12?` — see §5.3 |
| **q3** Steps | *(omit entirely)* | **retired.** Stays in the full record; costs 53 B/church in the index for nothing — see §7 |
| **q4** Groups | `a`, **`cell`** | the colour comes from `cell`, never from the answer |
| **q5** Login | `a` | fully table-driven |
| **q6** Giving | `a`, **`cell`** *(or `op`)* | the colour comes from neither the answer nor a table — see §5.1 |
| **q7** Website | `a`, `p`, `pk` | `p` is the display label, `pk` the filter key — **two separate facets** |
| **q8** App | `a`, `p`, `pk` | same |
| **q9** Times | `a`, `c` | bands on the count (3+ = full favor, 2 = soft, 1 = neutral) |
| **q10** Campuses | `a`, `c` | same |

`q12` stays out of the index and in the record, matching today.

**Never emit a colour the engine could compute differently.** If a record names
its own `cell`, that always wins over any inference — so the index must carry it
or the two views diverge by construction.

## 4 · Required top-level fields

| key | is | needed by |
|---|---|---|
| `id` | org_id | **the join key for every mark, note and export. Stable forever.** |
| `n` | name | the row, the name search, every sort's tiebreak |
| `ct` `rg` `co` | city · region · country | sub-line + the region cascade — see §5.2 |
| `nw` | network | badge + filter |
| `pf` | platform key | the platform line |
| `u` `cu` | own_url · church_url | the contact row's "Visit website" |
| `ts` | fetched_last | "scraped <date>" + the `scraped` sort |
| `lg` | language facet | the language filter. **Absent when never screened — never `""`** |
| `ns` | `{l, s}` | `l` = looked; `s` = 8 chars in STEP_CATS order, `p`/`a`/`n` |
| `lo` `lx` `lt` `lr` | logo sha · ext · theme · reject reason | the thumbnail and its backing |
| `em` `ph` `so` | ≤3 contacts · phone · socials | the contact row. `so` **only** when `em` is empty |
| `rec` | sha256 of the full record | the lazy-fetch key |

**Omit empty values; never emit `""`.** This is not cosmetic. An empty `lg`
builds a facet option for the empty string and offers a filter that means
nothing.

**`ns` is two facts, not one.** `l: false` means no next-step page was read at
all, and the console must then render "not checked" — never "0 of 8". Eight grey
dots and a zero are visually identical to a hurried reader, and the difference is
the difference between a fact about the church and a gap in our data. Emit `l`
even when it is false.

---

## 5 · Three confirmed gaps in the current publish

All three found by folding the shipped fixture through the real engine and
diffing against `golden-colors.json`.

### 5.1 · q6 carries no verdict — 101 of 1,340 cells wrong

`colorState` resolves q6 through an `opportunity` fallback. The full record has
`q6.opportunity`; the slim index has neither that nor `cell`. So:

```
q6 external_handoff   index → unk    record → good   × 94
q6 convenient         index → unk    record → bad    ×  7
```

76% of churches painted grey in the list and correctly in the dossier.

**Fix:** emit `q6.cell` (preferred — it is what the engine consults first) or
`q6.op`. In the fixture `opportunity` is a pure function of the answer, 134/134:
`external_handoff → true`, `convenient → false`, `unknown → absent`.

*Note: `docs/06-DATA-CONTRACT.md` already shows `"q6": {"a":"external_handoff","cell":"good"}`
as though this were being emitted. It is not, in the shipped fixture.*

The console currently reconstructs this itself and will keep honouring a
published `cell`/`op` in preference — so fixing it upstream is safe and
non-breaking.

### 5.2 · Spelled-out states are dropped — 2 of 134 churches

The builder keeps short subdivision codes and discards anything spelled out:

```
scrape        "Ocean Springs, Mississippi"   → rg: "USA"      (state lost)
scrape        "Newton, NC"                   → rg: "NC, USA"  (kept)
```

Those churches then match no state filter and appear only under "any". The full
record still knows it is `MS`.

**Fix:** normalise the subdivision to its code *before* writing `rg`
(`Mississippi → MS`, `Texas → TX`). The console already carries the full US
name→code map and will accept either.

Also: keep `rg` strictly `"SUBDIV, COUNTRY"`. Five fixture rows have a one-part
`rg`, and for one of them that part is `"USA"` — a country sitting where a
subdivision is expected, which put "USA" in the state dropdown until the console
guarded against it. If there is no subdivision, omit it rather than falling back
to the country.

### 5.3 · There is nowhere to put an uncited staff count

A paid-staff count has **three strengths**, and they must not look alike:

```
27    cited      titles verified verbatim on the staff page
12+   floor      the page does not enumerate everyone; the real number is ≥ 12
12?   uncited    we counted rows; no title was verified
```

The index schema has `fl` for the floor and **nothing for uncited**. So an
uncited estimate publishes as a bare `12` — a number that reads as a
measurement.

No church in the fixture has `count_is_uncited`, so this is **untested, not
proven safe**; the synthetic record `zz_staff_uncited` exists precisely because
the state is real and this batch does not contain one.

**Fix:** emit `uc: true` alongside `fl`. This is the same failure class the whole
dataset is built against — an uncertain thing rendered as a certain one.

### 5.4 · Not a gap: 3 of 134 churches have no name

`missionchurchvb_com`, `quadcity_church` and `wolbc_org` publish `n: ""`, and the
full record agrees (`name`, `name_original` both empty, `name_repair` empty). The
pipeline never resolved a name for them.

**This is honest data and needs no fix upstream.** It is recorded here because
the console must handle it — every such row still renders completely, with
`(unnamed)` standing in, and remains searchable, markable and exportable by
`org_id`. Hiding the row, or leaving the name slot blank, would turn a small gap
in our data into an invisible church.

The validator reports the count rather than failing, and fails only if it exceeds
10% of the corpus — at which point it is a pipeline regression rather than the
usual handful.

---

## 6 · The publish layout

```
publish/<publish_id>/
  manifest.json      publish_id, built_at, git_sha, n_churches, answer counts,
                     and { org_id -> {rec_sha, logo_sha, logo_ext, thumb_sha} }
  index.json.gz      the slim index, sorted by org_id
  vocab.json         extracted by EXECUTING core.js — never hand-maintained
  records/<rec_sha>.json
  logos/<logo_sha>.<ext>          originals; SVG stays SVG
  logos-thumb/<sha>.webp          108x108, contain, transparency preserved
  CHANGELOG.md       what moved since the last publish, in prose
```

`publish_id` = `YYYY-MM-DDTHHMM-<git_sha[0:7]>` — sortable, traceable, readable.

**Records and logos are keyed by the sha256 of their own bytes**, not by `org_id`
or `publish_id`. Three things fall out free:

- **Incremental republish** — a pass that fixed 200 churches uploads 200 files, not 14,396.
- **Free rollback** — repoint the pointer; every record it references still exists.
- **`immutable` caching is always correct** — a URL's content can never change.

### The pointer, and the ordering that makes a crash harmless

```jsonc
// data/current.json — the ONLY mutable blob in the data path. ~200 B, no-store.
{ "publish_id": "2026-08-14T0930-a1b2c3d",
  "built_at":   "2026-08-14T09:30:11Z",
  "n_churches": 14396,
  "index_url":  ".../index.json.gz",
  "index_sha256": "...",
  "vocab_url":  "...",
  "notes": "Q8 app-store pass complete; 11,204 churches moved off unknown." }
```

**Upload every record, logo and index FIRST; write `current.json` LAST.** A
half-published dataset is then invisible, and a crash mid-publish is a no-op.

### Two things a republish must respect

- **An answer can change for a church already exported.** Each export event
  therefore stores its `publish_id` and a frozen snapshot of the exported rows —
  otherwise *"what did we send them in July?"* becomes unanswerable.
- **A republish can remove a church.** Marks on a departed church are preserved
  and hidden, never deleted. State is keyed on `org_id` and nothing else — never
  on `publish_id`, never on a record hash — so a republish must not touch a
  single mark.

**Do not hard-code 14,396 anywhere.** The scope predicate has moved five times
and is still open.

---

## 7 · What must never be stripped from the full record

The strip list is fine — `logo_palette.measurement`, the WCAG check output,
`brand.logo_candidates`, `contact.contacts`. 18,516 → 13,285 B.

**The rule that governs every future cleanup:**

> If a field's only job is to **qualify, cite, date, or cast doubt on** an answer,
> it ships.

That covers `quote`, `source_url`, `verified`, `evidence_kind`, `confidence`,
`disclaimer`, `reason`, `label`, `claimed_quote`, `best_match_on_page`,
`similarity`, `unread_source`, `how_measured`, `count_is_floor`,
`count_is_uncited`, `state`, `own_terms`, `quote_confidence`. **None may be
stripped for size, ever.**

Four that look like dead weight and are not:

- **`q2.titles` + `disclaimer`** — the titles *are* the evidence for the count.
- **`contact.roster`** — the biggest remaining field, and what a rep works from.
- **`brand.logo_rejected` / `logo_absent_reason`** — "no logo found" and "we found
  one and rejected it" are different facts and the card says which.
- **`logo_palette.theme_light` / `theme_dark` / `accent_seed` / `logo_ink_hex`** —
  today's console reads none of them. Disciple Studio's product is generating a
  *branded* demo site; these are the per-church brand tokens and they are why this
  dataset is worth more here than in the old console.

**Sub-signal quotes inherit their URL.** 30 quotes in the fixture sit in
`q4.subsignals[]` with no `source_url` of their own — it lives on the parent
`q4`. That is fine and the console handles it, but it means the parent's
`source_url` can never be dropped while a sub-signal quote survives.

### One saving available now

**q3 can leave the index** — it is retired from display, has no facet, and does
not score. Measured: **53 B/church raw**, ~0.7 MB across 14,396. It stays in the
full record, exactly as `q12` does.

---

## 8 · How to check a publish before shipping it

The console's own test suite is the reference implementation of everything above,
and it runs in ~200 ms with no dependencies:

```
npm test          # in the Disciple Studio repo
```

The load-bearing one is `golden.test.mts`. It folds every church through the
colour and favor engine **twice — once from the full record, once from the slim
index — and requires identical output.** That single assertion is what makes the
list and the dossier incapable of disagreeing, and it is what surfaced all three
gaps in §5.

To validate a *new* publish, point the suite at it:

```
LEADS_FIXTURE_DIR=/path/to/publish/<publish_id> npm test
```

It needs `index.json`, `records/<org_id>.json` and `vocab.json`. A publish that
passes is colour-complete by construction. A publish that fails names the exact
churches and cells.

> The acceptance test for the data has never been a green pipeline. It is the
> owner reading churches 100 at a time, by hand. This suite exists so that review
> is spent on judgement rather than on catching mechanical drift.
