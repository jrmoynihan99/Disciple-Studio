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

import { resolve } from "../group.ts";
import { extrasOf, toRawChurch } from "../demo-export.ts";
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
});
