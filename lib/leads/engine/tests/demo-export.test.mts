/**
 * What a demo is built from — the reviewed card, not the raw record.
 *
 * WHY THESE ASSERT FIELDS RATHER THAN CALLING `generateDemo`.
 *
 * It would be better to run the adapter's output through the real function and
 * assert the rendered label, and that is what I tried first. `lib/generateDemo.ts`
 * imports `@/lib/color` and `@/components/templates`, and `node --test` resolves
 * no path alias — the same constraint `client/state.ts` records at the top of its
 * own imports. Pulling the React template registry into an engine test to reach a
 * pure function would be worse than the gap.
 *
 * So each assertion names the rule in `generateDemo` it is standing in for, and
 * the end-to-end path (edit a title → export → read it back off `/c/<slug>`) is
 * checked live rather than here.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { applyOp, cardFlags, resolve, sanitizeOp } from "../group.ts";
import { extrasOf, toRawChurch } from "../demo-export.ts";
import { LOGO_ITEM_ID } from "../group-types.ts";
import type { ChurchSnapshot, GroupEntry, SnapshotStep } from "../group-types.ts";

const step = (over: Partial<SnapshotStep> = {}): SnapshotStep => ({
  id: "s_group",
  key: "group",
  label: "Small Groups",
  state: "present",
  ownTerms: [],
  quote: "Join a group this fall.",
  quoteConfidence: "high",
  verified: "exact",
  sourceUrl: "https://example.org/groups",
  ...over,
});

const snapshot = (over: Partial<ChurchSnapshot> = {}): ChurchSnapshot => ({
  name: "Grace Community Church",
  nameOriginal: "Grace Community Church",
  nameRepair: null,
  churchUrl: "https://grace.example.org",
  logo: null,
  noLogo: null,
  slogan: { text: "Come as you are", scope: "homepage" },
  stepsLooked: true,
  steps: [step()],
  pathway: {
    present: false,
    status: "",
    name: "",
    orderBasis: null,
    sourceUrl: "",
    steps: [],
    finding: null,
  },
  contacts: [],
  contactNote: "",
  ...over,
});

const entry = (over: Partial<GroupEntry> = {}): GroupEntry => ({
  orgId: "grace_org",
  addedAt: 0,
  rec: "",
  publishId: "p1-test",
  snapshot: snapshot(),
  edits: { fields: {}, suppressed: {}, added: [] },
  ...over,
});

const raw = (e: GroupEntry) => {
  const { church } = toRawChurch(resolve(e));
  assert.ok(church, "expected a generatable church");
  return church;
};

describe("the reviewed church is what gets generated", () => {
  /**
   * THE RULE THIS WHOLE ADAPTER EXISTS FOR.
   *
   * `generateDemo`'s `pass()` prefers a step's `name` over its `final_name` when
   * `name_confidence` AND `name_fit` are both medium-or-high. Upstream that is
   * right — nobody has read the step yet. Here it is wrong: the title on the card
   * is the one a person approved, and possibly typed themselves.
   *
   * Two things together make the rule unable to fire, and BOTH are asserted:
   * `name` is empty so there is nothing to prefer, and the name audits are blank
   * so the branch is not taken in the first place. Either one alone would be a
   * single edit away from shipping a different word than the reviewer chose.
   */
  test("the reviewed title is the final_name, and nothing can outrank it", () => {
    const edited = entry({
      edits: {
        fields: {
          "steps.s_group.label": { value: "Life Groups", base: "Small Groups", at: 1 },
        },
        suppressed: {},
        added: [],
      },
    });
    const [s] = raw(edited).next_steps!;
    assert.equal(s.final_name, "Life Groups");
    assert.equal(s.name, "", "a non-empty name is what pass() would promote over final_name");
    assert.equal(s.name_confidence, "");
    assert.equal(s.name_fit, "");
  });

  test("an untouched title is carried unchanged", () => {
    assert.equal(raw(entry()).next_steps![0].final_name, "Small Groups");
  });

  /** Striking a step out is the reviewer saying "do not send this". */
  test("a struck-out step never reaches the demo", () => {
    const struck = entry({
      snapshot: snapshot({ steps: [step(), step({ id: "s_serve", key: "serve", label: "Serve" })] }),
      edits: { fields: {}, suppressed: { s_serve: 1 }, added: [] },
    });
    assert.deepEqual(
      raw(struck).next_steps!.map((s) => s.final_name),
      ["Small Groups"],
    );
  });

  test("a hand-added step is carried like any other", () => {
    const added = entry({
      edits: {
        fields: {},
        suppressed: {},
        added: [{ id: "u_abc123", at: 1, kind: "step", label: "Alpha Course", quote: "" }],
      },
    });
    assert.deepEqual(
      raw(added).next_steps!.map((s) => s.final_name),
      ["Small Groups", "Alpha Course"],
    );
  });

  /**
   * `generateDemo` drops a `misc` step unless all four audits pass. A reviewer who
   * left it on the card has decided it ships, so `misc` is the one category where
   * the audits are all allowed through — safe only because `name` is still empty.
   */
  test("a misc step the reviewer kept is not silently dropped", () => {
    const misc = entry({
      snapshot: snapshot({ steps: [step({ id: "s_misc", key: "misc", label: "Prayer Wall" })] }),
    });
    const [s] = raw(misc).next_steps!;
    assert.equal(s.category, "misc");
    assert.equal(s.name_confidence, "high");
    assert.equal(s.name_fit, "high");
    assert.equal(s.name, "", "even here, final_name must still win the label");
  });

  /**
   * THE CASE THE TEST ABOVE LOOKED LIKE IT COVERED AND DID NOT.
   *
   * `step()` supplies a quote by default, so the assertion above only ever ran
   * the quoted branch. `keepMisc` set the name audits alone, which left a
   * quote-less `misc` step failing the other two — `generateDemo` requires all
   * four — so it was dropped from the demo after being displayed, counted and
   * approved on the review card. 360 churches in the corpus, because
   * `snapshot.ts` blanks the quote whenever the pipeline had no `source_url` to
   * attribute it to.
   *
   * The absence of a quote must NOT be repaired here — it is the description that
   * falls back to the generic prose, not the step that disappears.
   */
  test("a misc step with no quote still reaches the demo", () => {
    const bare = entry({
      snapshot: snapshot({
        steps: [
          step({ id: "s_misc", key: "misc", label: "Prayer Wall", quote: "", sourceUrl: "" }),
        ],
      }),
    });
    const [s] = raw(bare).next_steps!;
    assert.equal(s.quote, "", "no quote may be invented for it");
    for (const audit of ["quote_confidence", "quote_category_fit", "name_confidence", "name_fit"] as const) {
      assert.equal(s[audit], "high", `${audit} must pass or generateDemo drops the step`);
    }
  });

  /** The licence is `misc`-only: everywhere else a missing quote must still read
   *  as missing, or every step would claim words the church never said. */
  test("a non-misc step with no quote keeps its quote audits blank", () => {
    const bare = entry({
      snapshot: snapshot({ steps: [step({ quote: "", sourceUrl: "" })] }),
    });
    const [s] = raw(bare).next_steps!;
    assert.equal(s.category, "group");
    assert.equal(s.quote_confidence, "");
    assert.equal(s.quote_category_fit, "");
  });

  /**
   * Reported rather than thrown: the caller exports twenty churches in a loop and
   * one unusable church must not take the other nineteen with it.
   */
  test("a church with nothing left is skipped, with a reason", () => {
    const empty = entry({ edits: { fields: {}, suppressed: { s_group: 1 }, added: [] } });
    const { church, reason } = toRawChurch(resolve(empty));
    assert.equal(church, null);
    assert.match(reason, /struck out/);
  });

  test("a church with no name is skipped rather than shipped as (no name)", () => {
    const nameless = entry({ snapshot: snapshot({ name: "" }) });
    const { church, reason } = toRawChurch(resolve(nameless));
    assert.equal(church, null);
    assert.match(reason, /name/);
  });
});

describe("quotes and prose", () => {
  /**
   * `generateDemo` uses a step's quote as its description when the quote audits
   * pass, and its own per-category prose otherwise. A reviewer who kept a quote
   * has vouched for it; a step with none must fall through to the generic copy
   * rather than shipping an empty description.
   */
  test("a kept quote is carried with both audits passing", () => {
    const [s] = raw(entry()).next_steps!;
    assert.equal(s.quote, "Join a group this fall.");
    assert.equal(s.quote_confidence, "high");
    assert.equal(s.quote_category_fit, "high");
  });

  test("no quote means the audits fail, so the demo falls back to prose", () => {
    const quiet = entry({ snapshot: snapshot({ steps: [step({ quote: "", sourceUrl: "" })] }) });
    const [s] = raw(quiet).next_steps!;
    assert.equal(s.quote, "");
    assert.equal(s.quote_confidence, "");
    assert.equal(s.quote_category_fit, "");
  });
});

describe("the discipleship pathway", () => {
  const withPathway = (steps: { id: string; label: string }[]) =>
    entry({
      snapshot: snapshot({
        pathway: {
          present: true,
          status: "",
          name: "Growth Track",
          orderBasis: "explicit_numbered",
          sourceUrl: "https://grace.example.org/track",
          steps: steps.map((s, i) => ({
            id: s.id,
            ordinal: i + 1,
            label: s.label,
            blurb: "",
            category: null,
            categoryRaw: "",
            quote: "",
            sourceUrl: "",
            verified: "",
            labelVerified: "",
          })),
          finding: null,
        },
      }),
    });

  test("the church's own pathway name and order are carried", () => {
    const church = raw(withPathway([{ id: "p_1", label: "Belong" }, { id: "p_2", label: "Grow" }]));
    assert.equal(church.discipleship_pathway?.name, "Growth Track");
    assert.equal(church.discipleship_pathway?.ordered, true);
    assert.deepEqual(church.discipleship_pathway?.steps?.map((s) => s.name), ["Belong", "Grow"]);
  });

  /**
   * `generateDemo` makes the pathway the FOCAL list whenever it is present, so an
   * empty one would demote the church's real next steps to a secondary block under
   * a heading with nothing beneath it.
   */
  test("a pathway whose steps were all struck out is omitted entirely", () => {
    const base = withPathway([{ id: "p_1", label: "Belong" }]);
    const struck = { ...base, edits: { fields: {}, suppressed: { p_1: 1 }, added: [] } };
    assert.equal(raw(struck).discipleship_pathway, null);
  });
});

describe("extras from the live record", () => {
  /**
   * The palette and the service time are the only things read off the record
   * rather than the card, because a reviewer never sees them. Measured against the
   * real key names — the lead corpus spells them under `logo_palette`, not at the
   * top level the way the pilot folder did.
   */
  test("the palette and service time are lifted from the record's own spelling", () => {
    const extras = extrasOf({
      q9: { times: "Sun 10:30 AM" },
      logo_palette: {
        theme_light: { bg: "#ffffff", ink: "#131e15" },
        theme_dark: { bg: "#080e09", ink: "#e9f1e9" },
        accent_light: "#00853b",
        accent_dark: "#00893d",
        theme_bg_source: { light: "logo_plate", dark: "derived_ramp" },
      },
    });
    assert.equal(extras.serviceTimes, "Sun 10:30 AM");
    assert.equal(extras.accentLight, "#00853b");
    assert.equal(extras.bgSourceLight, "logo_plate");
    assert.equal(extras.bgSourceDark, "derived_ramp");
    assert.equal(extras.themeDark?.bg, "#080e09");
  });

  /**
   * A church that has left the dataset has no record to read. The card is
   * explicitly "the only copy we hold" for those, so the export has to survive it
   * — with template defaults rather than an exception.
   */
  test("a departed church still produces a church, on defaults", () => {
    const extras = extrasOf(null);
    assert.equal(extras.serviceTimes, undefined);
    assert.equal(extras.themeLight, undefined);
    const { church } = toRawChurch(resolve(entry()), extras);
    assert.ok(church);
    assert.equal(church.theme_light, undefined);
    assert.equal(church.church_title, "Grace Community Church");
  });
});

/**
 * THE COLOURS BELONG TO THE PICTURE THEY WERE MEASURED FROM.
 *
 * A demo is a page in a church's own colours, and "their colours" is a
 * measurement taken from one particular image. Once a reviewer can choose a
 * different image, a ramp that stays put is not stale in a way anybody notices —
 * it renders, and it renders the colours of the mark they just rejected. At
 * `rushcreek_org` the pipeline's pick is a cookie-consent plugin's badge, so
 * every demo would have shipped in `#003399` while displaying the church's own
 * logo. Nothing downstream could have caught it: `logo_palette` is one object on
 * the record and `mapTheme` maps whatever it is handed.
 *
 * The join is `sha256 -> logo_alts[i]`, because the sha256 is the only thing the
 * entry stores. The palette's own `palette_sha8` is a sha1 prefix and cannot be
 * derived from it — `leads:pack` asserts `palette_sha8 === sha8` on all 19,803
 * alternatives instead, so this lookup can trust what it finds.
 */
describe("the palette follows the chosen logo", () => {
  const ALT = "b".repeat(64);
  const record = {
    brand: { logo_theme: "light" },
    logo_palette: {
      theme_light: { bg: "#ffffff", accent: "#003399" },
      accent_light: "#003399",
      palette_gate: "",
    },
    logo_alts: [
      {
        sha: ALT,
        sha8: "87622514",
        ext: "png",
        theme: "dark",
        palette: {
          palette_sha8: "87622514",
          theme_light: { bg: "#f7f3ea", accent: "#009cff" },
          accent_light: "#009cff",
          palette_gate: "",
        },
      },
    ],
  };

  test("choosing an alternative takes its ramp, not the pick's", () => {
    const extras = extrasOf(record, ALT);
    assert.equal(extras.accentLight, "#009cff");
    assert.equal(extras.themeLight?.bg, "#f7f3ea");
  });

  test("the pipeline's own pick still reads the record's ramp", () => {
    // The pick's sha matches no alternative — that IS the pick — so the lookup
    // falls through to `logo_palette`, which is where its own measurement lives.
    const extras = extrasOf(record, "a".repeat(64));
    assert.equal(extras.accentLight, "#003399");
  });

  test("asking without a sha is the pre-alternatives behaviour, unchanged", () => {
    assert.equal(extrasOf(record).accentLight, "#003399");
  });

  /**
   * A snapshot can name a logo the record no longer offers — the corpus is
   * republished and the entry is frozen. The record's own ramp is then both the
   * best answer available and the one that ships today; guessing nothing would
   * paint the church in the studio's default clay instead of their colours.
   */
  test("a sha the record has never heard of falls back rather than blanking", () => {
    assert.equal(extrasOf(record, "f".repeat(64)).accentLight, "#003399");
  });

  test("it survives a record with no alternatives and no palette at all", () => {
    assert.equal(extrasOf({}, ALT).accentLight, undefined);
    assert.equal(extrasOf(null, ALT).themeLight, undefined);
  });

  /** End to end: the field `generateDemo` actually reads. */
  test("the switched logo's colours reach the RawChurch", () => {
    const { church } = toRawChurch(resolve(entry()), extrasOf(record, ALT));
    assert.ok(church);
    assert.equal(church.logo_accent_light, "#009cff");
    assert.equal(church.theme_light?.accent, "#009cff");
  });
});

describe("contacts", () => {
  const person = (id: string, name: string, email: string) => ({
    id,
    kind: "person" as const,
    name,
    title: "Pastor",
    roleLabel: "",
    email,
    value: "",
    network: "",
  });

  type Carried = { people: { name: string; rank: number; email: string }[] };

  /**
   * Through `exportContacts`, which is already the one rule for "which four ship
   * and in what order" and is what the review card renders. Reading the raw list
   * here would let a demo name somebody the reviewer never saw — the exact drift
   * that function exists to prevent.
   */
  test("only the contacts that ship are carried, ranked", () => {
    const withPeople = entry({
      snapshot: snapshot({
        contacts: [
          person("c1", "Sarah Vance", "sarah@grace.example.org"),
          person("c2", "Ben Ellis", "ben@grace.example.org"),
        ],
      }),
    });
    const carried = raw(withPeople).contacts as Carried;
    assert.deepEqual(
      carried.people.map((p) => [p.name, p.rank]),
      [
        ["Sarah Vance", 1],
        ["Ben Ellis", 2],
      ],
    );
  });

  /** `demoFirstName` sorts `people[]` on `rank` to name the demo member, so rank 1
   *  must be the church's own first contact. */
  test("the first contact is rank 1, which is what names the demo member", () => {
    const withPeople = entry({
      snapshot: snapshot({ contacts: [person("c1", "Toddnetta Trice", "t@grace.example.org")] }),
    });
    const carried = raw(withPeople).contacts as Carried;
    assert.equal(carried.people[0].rank, 1);
    assert.equal(carried.people[0].name, "Toddnetta Trice");
  });

  test("a struck-out contact is not carried", () => {
    const struck = entry({
      snapshot: snapshot({ contacts: [person("c1", "Sarah Vance", "sarah@grace.example.org")] }),
      edits: { fields: {}, suppressed: { c1: 1 }, added: [] },
    });
    const carried = raw(struck).contacts as Carried;
    assert.deepEqual(carried.people, []);
  });

  /* ---------------------------------------------------------------- *
   * A logo the reviewer rejected
   * ---------------------------------------------------------------- */

  /**
   * THE PIPELINE SOMETIMES SHIPS THE WRONG PICTURE — a stock photo, a sponsor's
   * mark, another church's badge. That was the one error a reviewer could see and
   * not fix: the choice was to send it or to remove the whole church.
   *
   * Removing it reuses `item.suppress` under a fixed id rather than inventing a
   * `logo.remove` op, so it is reversible, counted, persisted and folded by the
   * one merge that already exists. What these assert is the consequence that
   * actually reaches a congregation: `card.logo` resolves to null, so the export
   * route never fetches the bytes and the demo is built with the church's name in
   * type instead.
   */
  describe("a rejected logo", () => {
    const withLogo = () =>
      snapshot({ logo: { sha: "a".repeat(64), ext: "png", theme: "light" } });

    test("survives untouched when nobody removed it", () => {
      const card = resolve(entry({ snapshot: withLogo() }));
      assert.equal(card.logo?.sha, "a".repeat(64));
      assert.equal(card.logoRemoved, false);
      assert.equal(cardFlags(card).some((f) => f.key === "logo"), false);
    });

    /**
     * THE TEST THAT WAS MISSING, AND THE FEATURE SHIPPED INERT WITHOUT IT.
     *
     * Every other test in this block builds `edits.suppressed` BY HAND, and the
     * only one that drove `applyOp` drove `item.restore` — which has no gate. So
     * the resolve half, the export half and the flag were all correct and
     * covered, while the one operation that reaches them did nothing at all:
     * `suppress()` accepted an itemId only if it matched a step, a pathway step
     * or a contact, and the logo is none of those. The ✕ was a no-op in the
     * browser and on the server, silently, for as long as it existed.
     *
     * This drives the REAL op, the way the button does.
     */
    test("the ✕ on the logo actually removes it", () => {
      const e = entry({ snapshot: withLogo() });
      assert.equal(resolve(e).logo?.sha, "a".repeat(64), "precondition: there is a logo");

      const after = applyOp(
        { entries: [e] } as unknown as Parameters<typeof applyOp>[0],
        { op: "item.suppress", orgId: e.orgId, itemId: LOGO_ITEM_ID },
        1,
      );
      assert.equal(
        after.entries[0].edits.suppressed[LOGO_ITEM_ID],
        1,
        "the op must reach storage — it used to be dropped on the floor",
      );

      const card = resolve(after.entries[0]);
      assert.equal(card.logo, null);
      assert.equal(card.logoRemoved, true);
    });

    /** Suppressing a logo that was never there would let the card claim somebody
     *  removed something that does not exist. The op is refused, not stored. */
    test("the op is refused on a church that has no logo", () => {
      const e = entry({ snapshot: snapshot({ logo: null }) });
      const after = applyOp(
        { entries: [e] } as unknown as Parameters<typeof applyOp>[0],
        { op: "item.suppress", orgId: e.orgId, itemId: LOGO_ITEM_ID },
        1,
      );
      assert.deepEqual(after.entries[0].edits.suppressed, {});
    });

    test("resolves to no logo once struck out, and says who did it", () => {
      const card = resolve(
        entry({
          snapshot: withLogo(),
          edits: { fields: {}, suppressed: { [LOGO_ITEM_ID]: 1 }, added: [] },
        }),
      );
      assert.equal(card.logo, null, "the export reads card.logo — it must be gone");
      assert.equal(card.logoRemoved, true);
      // Visible on a COLLAPSED card, where the `put back` control is not.
      assert.ok(cardFlags(card).some((f) => f.key === "logo"));
    });

    test("putting it back restores the real logo", () => {
      const e = entry({
        snapshot: withLogo(),
        edits: { fields: {}, suppressed: { [LOGO_ITEM_ID]: 1 }, added: [] },
      });
      const restored = applyOp(
        { entries: [e] } as unknown as Parameters<typeof applyOp>[0],
        { op: "item.restore", orgId: e.orgId, itemId: LOGO_ITEM_ID },
        2,
      );
      const card = resolve(restored.entries[0]);
      assert.equal(card.logo?.sha, "a".repeat(64));
      assert.equal(card.logoRemoved, false);
    });

    /* -------------------------------------------------------------- *
     * Switching to one of the runner-ups
     * -------------------------------------------------------------- */

    /**
     * WE PICK ONE IMAGE PER CHURCH AND ARE CONFIDENTLY WRONG OFTEN ENOUGH TO
     * MATTER — a cookie-consent badge, a children's-ministry sub-brand, a photo
     * of the building, a stock-photo cross, each with the church's real mark one
     * row down the candidate list. 11,749 of 15,273 churches now ship runner-ups
     * so a reviewer can overrule us.
     *
     * What these assert is what reaches the congregation: which bytes the export
     * fetches, and which theme the demo opens in.
     */
    const alt = { sha: "b".repeat(64), ext: "svg", theme: "dark" };
    const pick = (e: ReturnType<typeof entry>, logo: typeof alt | null) =>
      applyOp(
        { entries: [e] } as unknown as Parameters<typeof applyOp>[0],
        { op: "logo.pick", orgId: e.orgId, logo },
        3,
      ).entries[0];

    test("a picked alternative is what the card carries", () => {
      const card = resolve(pick(entry({ snapshot: withLogo() }), alt));
      assert.equal(card.logo?.sha, "b".repeat(64));
      assert.equal(card.logo?.theme, "dark", "the plate and the demo's mode ride on this");
      assert.equal(card.logoSwitched, true);
      assert.equal(card.editedCount, 1, "switching is work somebody did");
    });

    /**
     * 241 churches have alternatives and NO pick of ours. For them this turns an
     * empty plate into a real choice, and the "why there is no logo" sentence has
     * to stop being said about a church that now has one.
     */
    test("a church we found no logo for can still be given one", () => {
      const e = entry({ snapshot: snapshot({ logo: null, noLogo: { reason: "too_small" } }) });
      assert.equal(resolve(e).logo, null);

      const card = resolve(pick(e, alt));
      assert.equal(card.logo?.sha, "b".repeat(64));
      assert.equal(card.noLogo, null, "the absence reason must not survive the logo arriving");
      assert.equal(cardFlags(card).some((f) => f.key === "noLogo"), false);
    });

    /** Picking ours again is a revert, not a stored choice that happens to match. */
    test("choosing our own logo again clears the override", () => {
      const switched = pick(entry({ snapshot: withLogo() }), alt);
      assert.equal(resolve(switched).logoSwitched, true);

      const back = pick(switched, { sha: "a".repeat(64), ext: "png", theme: "light" });
      assert.equal(back.edits.logoPick, undefined, "the key must be gone, not merely equal");
      assert.equal(resolve(back).logo?.sha, "a".repeat(64));
      assert.equal(resolve(back).logoSwitched, false);
      assert.equal(resolve(back).editedCount, 0);
    });

    test("`null` puts ours back too", () => {
      const back = pick(pick(entry({ snapshot: withLogo() }), alt), null);
      assert.equal(resolve(back).logo?.sha, "a".repeat(64));
      assert.equal(resolve(back).logoSwitched, false);
    });

    /**
     * THE WHOLE POINT OF THE FEATURE IS THAT IT IS PLAYABLE: pick, remove, pick
     * again, put back, in any order. Removal and choice are independent, so
     * putting one back restores whichever image was CHOSEN rather than ours.
     */
    test("switching and removing compose in either order", () => {
      const e = entry({ snapshot: withLogo() });

      const switchedThenStruck = applyOp(
        { entries: [pick(e, alt)] } as unknown as Parameters<typeof applyOp>[0],
        { op: "item.suppress", orgId: e.orgId, itemId: LOGO_ITEM_ID },
        4,
      ).entries[0];
      let card = resolve(switchedThenStruck);
      assert.equal(card.logo, null, "struck out wins over any choice");
      assert.equal(card.logoRemoved, true);

      const restored = applyOp(
        { entries: [switchedThenStruck] } as unknown as Parameters<typeof applyOp>[0],
        { op: "item.restore", orgId: e.orgId, itemId: LOGO_ITEM_ID },
        5,
      ).entries[0];
      card = resolve(restored);
      assert.equal(card.logo?.sha, "b".repeat(64), "put back restores THEIR choice, not ours");

      // …and switching again while struck out leaves it struck out.
      const stillStruck = pick(switchedThenStruck, { sha: "c".repeat(64), ext: "png", theme: "light" });
      assert.equal(resolve(stillStruck).logo, null);
      assert.equal(resolve(stillStruck).logoRemoved, true);
    });

    /** The export reads `card.logo`, so the switch reaches the demo for free. */
    test("the picked logo, and its theme, are what the demo is built with", () => {
      const card = resolve(pick(entry({ snapshot: withLogo() }), alt));
      const { church } = toRawChurch(card, { logoTheme: "light" });
      assert.equal(
        church?.logo_theme,
        "dark",
        "the record describes the logo we picked; the card describes the one they chose",
      );
    });

    /* -------------------------------------------------------------- *
     * The op is a boundary, so it is checked like one
     * -------------------------------------------------------------- */

    test("sanitizeOp refuses a forged logo", () => {
      const ok = { op: "logo.pick", orgId: "x", logo: { sha: "a".repeat(64), ext: "png", theme: "light" } };
      assert.ok(sanitizeOp(ok), "a well-formed pick must survive");
      assert.equal(sanitizeOp({ ...ok, logo: { ...ok.logo, sha: "../../churches/secret" } }), null);
      assert.equal(sanitizeOp({ ...ok, logo: { ...ok.logo, sha: "A".repeat(64) } }), null, "hex is lower-case");
      assert.equal(sanitizeOp({ ...ok, logo: { ...ok.logo, sha: "a".repeat(63) } }), null);
      assert.equal(sanitizeOp({ ...ok, logo: { ...ok.logo, ext: "html" } }), null);
      assert.equal(sanitizeOp({ ...ok, logo: { ...ok.logo, theme: "chartreuse" } }), null);
      assert.equal(sanitizeOp({ ...ok, orgId: "" }), null);
      // `null` is a real instruction — "go back to ours" — not a malformed body.
      assert.deepEqual(sanitizeOp({ op: "logo.pick", orgId: "x", logo: null }), {
        op: "logo.pick",
        orgId: "x",
        logo: null,
      });
    });

    /**
     * A suppression left behind on a church whose logo has since LEFT the
     * snapshot must not claim a person removed something that is not there —
     * there would be nothing to put back, and the flag would be a lie about who
     * did what.
     */
    test("a church that never had a logo is not reported as one somebody removed", () => {
      const card = resolve(
        entry({
          snapshot: snapshot({ logo: null }),
          edits: { fields: {}, suppressed: { [LOGO_ITEM_ID]: 1 }, added: [] },
        }),
      );
      assert.equal(card.logo, null);
      assert.equal(card.logoRemoved, false);
      assert.equal(cardFlags(card).some((f) => f.key === "logo"), false);
    });
  });
});
