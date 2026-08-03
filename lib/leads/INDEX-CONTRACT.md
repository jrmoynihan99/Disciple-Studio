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

This is the one that gets missed, and it has been missed four times already
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
| **q1** Pathway | `a` | fully table-driven. The ORDERED pathway goes on the record only — see §3.1 |
| **q2** Staff | `a`, `c`, **`sc`** | the colour bands on the count; `sc` is the claim's strength and renders `12` / `12+` / `12+?` — see §5.3 |
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

### 3.1 · The ordered discipleship pathway — RECORD ONLY

A church's own named, ordered track ("Growth Track: Step 1 Baptism … Step 7
Leadership") now exists in the demo-side export as `discipleship_pathway_*`. It
does not reach the console at all, in either view.

**Put it on the full record. Do NOT put it in the index.** 4 of 100 churches have
one, so ~96% of rows would carry an empty array, and the index is the one file
every user downloads on cold load. It is dossier content by nature: nothing
filters, sorts, facets or scores on it.

Emit it under `q1`, spelled exactly as the demo export already spells it, so a
third wording of the same fact never comes into existence:

```jsonc
"q1": {
  "answer": "yes",
  "pathway_name": "LIFE Track",              // verbatim; "" when unnamed
  "pathway_source_url": "https://…/new-here",
  "pathway_order_basis": "explicit_sequenced",
  "pathway_steps": [
    {
      "ordinal": 1,                          // 1-based, dense, no gaps
      "label": "Visit LifeGate",             // VERBATIM
      "blurb": "",
      "category": "connect",                 // one of the 8, or null
      "category_raw": "visit",               // the richer upstream word
      "source_url": "https://…/new-here",
      "quote": "Visit LifeGate",
      "verified": "exact",
      "label_verified": "exact"
    }
  ]
}
```

**`pathway_order_basis` is the field that makes this renderable.** Four values —
`explicit_numbered`, `explicit_sequenced`, `page_order`, or absent. Only the first
two license printing "Step 1 → Step 4"; `page_order` means we know the DOM order
and nothing about sequence, and the console will render it as an unnumbered list.

**`label_verified` proves the label is ON the page, never that it is the step's
NAME.** Page furniture verifies `exact` too — six footer and header blocks did,
in a shipped build, under a pathway titled "LIFE Track". Keep the upstream
furniture guard; do not treat this field as sufficient.

### 3.2 · The runner-up logos — COUNT on the index, ARRAY on the record

Shipped, and this is the written form of what arrived — the same shape §3.1
prescribes, for the same reason.

We pick one logo per church and are confidently wrong often enough to matter: a
GDPR cookie badge, a children's-ministry sub-brand, a photo of the building, an
iStock cross. Each of those had the church's real mark one row down. Which
picture represents a church is a judgement about an image — it cannot be cited
and no rule decided it reliably — so every candidate that cleared the same bar is
offered and **a person picks**. 11,749 of 15,273 churches (76.9%) have at least
one; 3,524 have none, which means "this church publishes exactly one usable
mark", an answer rather than a gap.

```jsonc
// index row
"la": 2,                             // COUNT ONLY. Omit when there are none.

// record
"logo_alts": [
  { "sha": "…64 hex…",               // sha256 → the archive member <sha>.webp
    "sha8": "87622514",              // sha1 PREFIX → the join key for the palette
    "ext": "png", "kind": "header_logo_img", "confidence": "named",
    "theme": "dark", "shape": "wordmark", "w": 600, "h": 97,
    "url": "https://…/RC-Logo-White.png",
    "palette": { "palette_sha8": "87622514", "accent_seed": "#009cff",
                 "theme_light": { …13 tokens… }, "theme_dark": { … },
                 "palette_gate": "" } }
]
```

**The five descriptors match `brand.logo_*` exactly**, so the pick and the
runner-ups are described in one vocabulary and a picker labels every option in
one loop with no special case for option 0.

**`theme` IS PER CANDIDATE and is what keeps the menu visible.** An icon and a
wordmark from one church routinely have opposite ink polarity; drawn on one plate,
half the options are invisible, which is indistinguishable from an option that
failed to load.

**A PALETTE PER CANDIDATE, JOINED BY `sha8`.** A demo is a page in a church's own
colours, and "their colours" is a measurement taken from one particular image — so
the ramp has to move when the reviewer moves the logo, or the demo ships the
colours of the mark they just rejected. At `rushcreek_org` the pick is a
cookie-consent plugin's badge: every demo would have gone out in `#003399` while
displaying the church's own logo, and nothing downstream could have noticed.

`sha8` exists because the two hashes are computed by different tools — `sha` is the
sha256 that keys the archive, `palette_sha8` is a sha1 prefix — so the equality
`palette.palette_sha8 === sha8` is the only way to ask *were these colours measured
from this picture?* **`leads:pack` asserts it on every candidate and on the pick
(`logo_palette.palette_sha8 === brand.logo_sha8`) and refuses to build otherwise.**
A ramp attached to a logo it was not measured from renders perfectly and renders
wrong, on a page a church receives.

**`palette_gate` is a measured absence, not a failure.** `""` means a brand colour
was found; `greyscale` / `tie` / `share_below_floor` / `many_colors` mean the mark
carries none and **no accent is invented for it** — 6,740 of 19,803. Both 13-token
ramps are present regardless.

**The two archives are disjoint and must be read as one namespace.** A runner-up
whose sha is already in `logos-thumb.tar` (it is some other church's pick) is not
repeated in `logos-alt.tar`, and nothing holding a sha can tell which archive it
came from. `MANIFEST.logo_alts.churches` is `org_id -> [sha, …]` and nothing else;
every other fact about a candidate lives on the record, once.

---

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
| `la` | how many runner-up logos | the "N options" affordance on the review card. **Count only — the array is on the record.** See §3.2 |
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

## 5 · Confirmed gaps in the current publish (and two that are not gaps)

§5.1–5.3 were found by folding the shipped fixture through the real engine and
diffing against `golden-colors.json`. §5.5 was found by trying to render a field
the row needs and discovering the index does not carry it — a reminder that the
rule in §2 catches the colour-engine cases and a *display* field can still go
missing quietly.

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

*Note: the package's `dev-only/docs/06-DATA-CONTRACT.md` already shows `"q6": {"a":"external_handoff","cell":"good"}`
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

### 5.3 · The staff count's strength needs one field, not two booleans

*(Rewritten. An earlier version of this section asked for `uc: true` beside `fl`.
That ask was wrong, in exactly the way described below — two booleans for one
fact. Ignore it; `sc` supersedes it.)*

A paid-staff count has **three strengths**, and they must not look alike:

```
27     exact          titles verified verbatim on the staff page
12+    floor          some titles were not found; the real number is ≥ 12
12+?   floor_uncited  every title WAS found, but the page lists more people than
                      distinct titles (two "Pastor" rows are one title). The
                      citations prove the ROLES, never the HEADCOUNT.
```

The index schema has `fl` for the floor and nothing else, so both of the other
two publish as a bare `12` — a number that reads as a measurement.

**Fix: emit a single `sc` enum**, `"exact" | "floor" | "floor_uncited"`.

**Not two booleans.** `floor_uncited` IS a floor, so a `fl` + `uc` pair fires
both flags on the same church, and every renderer downstream must then choose one
— floor wins under any sane ladder, and the second flag becomes unobservable.
That is not hypothetical: the demo-side pipeline shipped exactly that pair, all
12 of its `uncited` churches also carried `floor`, and the `12?` form rendered for
nobody. It has since collapsed them into `paid_staff_claim` with these three
values. `sc` is the same field under the index's short-key convention, so the two
artifacts cannot disagree.

The console honours `sc` first and falls back to `fl`/`uc` so a pre-enum publish
keeps rendering. One case is deliberately **not** folded: `uc` alone, without
`fl`, is the older and *weaker* claim — rows counted, no title verified at all —
and it renders `12?`. Do not emit it for a floor; it means something else.

No church in the shipped fixture carries any uncited flag, so all of this is
**untested by real data, not proven safe**. The synthetic record
`zz_staff_uncited` exists precisely because the state is real and this batch does
not contain one.

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

### 5.5 · The slogan is dropped — 51 of 134 churches

The record carries `brand.slogan` (51 of 134), `brand.slogan_scope` and
`brand.slogan_confidence`. **The index carries none of them.**

The list row shows the slogan under the church name — it is how a reviewer
recognises a church at a glance, and it is the one line of the church's own voice
in a screen full of verdicts. Rendered from the index alone, all 134 rows would
read "no slogan found", which is a **false negative about 51 real churches**.

Add two fields:

```jsonc
"sl": "Love God, Love People",   // brand.slogan, verbatim, "" when none
"ss": "homepage_only"            // brand.slogan_scope, "" when the search was complete
```

**Both, not just `sl`.** There are three states and the text alone distinguishes
only two:

| `sl` | `ss` | means |
|---|---|---|
| set | — | the slogan |
| `""` | `homepage_only` | only the homepage was read — **absence is not evidence of absence**, /about is where a slogan usually lives |
| `""` | `""` | we looked properly and there is none |

Collapsing the middle row into "no slogan found" asserts something the pipeline
never checked. In the current fixture **every one of the 83 churches without a
slogan is `homepage_only`** — the console can never honestly say "none found"
about this corpus, and it does not.

`slogan_confidence` is deliberately NOT requested: the row does not vary on it,
and a field nothing consumes is a field that silently rots.

Until a publish carries these, they are projected in. That used to be a
dev-source shim in the server layer, reading 134 record files per process — fine on local
disk, and exactly what does not work at 15,273. It now happens **once per pack**,
in `scripts/leads-pack.mts`, while the records are already streaming past for
their sha check, and the pack prints the count it filled. Still a shim, still not
the contract: every one of the 15,273 rows needs it on the current publish.

### 5.7 · `rec` is missing from every row — 15,273 of 15,273

`rec` is §4's own required field, and no publish has ever carried it. `leads:pack`
backfills it from `MANIFEST.records` and says so on every run:

```
! 15273 rows had no 'rec' sha; backfilled from MANIFEST.
  Staleness detection depends on it — ask upstream to project it into index.json.
```

**What depends on it.** A batch entry freezes the record's sha at collect time, and
the review page compares it against the row's `rec` to say *this church's data
changed since you collected it*. With no `rec` on the row there is nothing to
compare against, and the warning silently never fires.

The backfill makes it work today and it is not free of consequence: it means the
index served to the browser is one the packer wrote, not one upstream signed. Two
lines in the index builder would end it.

### 5.6 · Not gaps: two states that are permanent by decision

Recorded here because both LOOK like backlog, and a future pass that "fills them
in" would be inventing data.

**`q5: custom_candidate` is terminal.** The step that would confirm a login
candidate renders the page, and that is not being run — the proxy bills per
megabyte and it is ~1,070 churches at full scale. It will never become
`custom_confirmed`.

22 of 134 churches (16%) sit here. The console keeps painting them `unver` with
the hatch, because "we have a signal we cannot stand behind" is still exactly
true — but the wording no longer says *"needs a check"*, since that asked a
salesperson for work nobody will do, on one church in six. Do not re-add a
"pending verification" flavour to this answer.

**`q10: unknown` is an abstention, not a missing measurement.** Only ~2,000 of
15,275 churches publish a locations page at all. Where there is none, the pipeline
abstains rather than inferring single-site — confirmed as deliberate.

The consequence downstream is worth stating: q10 is grey for **80% of the
fixture**, so *The rest — lighter-touch signals* has **no church scoring 5/5**;
the observed maximum is 4.5. That is correct. An unmeasured signal must score
zero, and a per-church denominator would make two churches' scores incomparable,
which is worse than an unreachable ceiling. **Do not make the denominator
dynamic, and do not backfill `single_site`.**

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
  these are the per-church brand tokens, and Disciple Studio's product is
  generating a *branded* demo site. They are why this dataset is worth more here
  than in the old console. (Written when the console read none of them; the review
  card now previews them and the export paints every demo with them.)
- **`logo_alts[].palette` and `logo_alts[].sha8`** — the same argument, one level
  down, and the `sha8` is load-bearing on its own: without it the colours cannot
  be tied to the picture they were measured from and a switched logo silently
  ships the wrong church's brand. See §3.2.
- **`logo_palette.palette_sha8` and `brand.logo_sha8`** — the pick's half of that
  same join. Two fields, one equality, asserted at pack time.

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
