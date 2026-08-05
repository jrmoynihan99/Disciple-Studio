/**
 * THE PREVIEW RENDERER, whose job is to find holes rather than to be pretty.
 *
 * Every test here is really one question: when a variable has no value, does the
 * preview SAY SO, or does it quietly render an email with a gap in it? The
 * second is worse than no preview at all, because it is read as reassurance.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "../engine/merge.ts";

const VARS = {
  greeting: "Bo",
  first_name: "Bo",
  company_name: "Dacus Church",
  demo_link: "https://www.disciple.studio/c/dacus-church",
};

test("variables are substituted", () => {
  const r = render("Hi {{greeting}}, I built {{company_name}} a page: {{demo_link}}", VARS, "dacus");
  assert.equal(r.text, "Hi Bo, I built Dacus Church a page: https://www.disciple.studio/c/dacus-church");
  assert.deepEqual(r.empty, []);
  assert.deepEqual(r.unknown, []);
});

/** The whole reason this file exists. */
test("an empty variable is REPORTED, not silently blanked", () => {
  const r = render("Hi {{first_name}},", { ...VARS, first_name: "" }, "x");
  assert.equal(r.text, "Hi ,");
  assert.deepEqual(r.empty, ["first_name"], "the preview must be able to say which slot is a hole");
});

test("greeting is never a hole, which is the point of it", () => {
  const r = render("Hi {{greeting}},", { greeting: "there" }, "x");
  assert.equal(r.text, "Hi there,");
  assert.deepEqual(r.empty, []);
});

test("a fallback rescues an empty variable and is not reported", () => {
  const r = render("Hi {{first_name|there}},", { first_name: "" }, "x");
  assert.equal(r.text, "Hi there,");
  assert.deepEqual(r.empty, []);
  assert.deepEqual(r.unknown, [], "the literal fallback is not a missing variable");
});

test("a fallback is skipped when the variable has a value", () => {
  const r = render("Hi {{first_name|there}},", { first_name: "Bo" }, "x");
  assert.equal(r.text, "Hi Bo,");
});

test("a chained fallback walks to the first value it has", () => {
  const r = render("{{first_name|last_name|friend}}", { first_name: "", last_name: "Cheatham" }, "x");
  assert.equal(r.text, "Cheatham");
});

test("an unknown tag is flagged and left visible rather than blanked", () => {
  const r = render("Hi {{fisrt_name}},", VARS, "x");
  assert.deepEqual(r.unknown, ["fisrt_name"]);
  assert.match(r.text, /\{\{fisrt_name\}\}/, "a typo must be conspicuous in the preview");
});

test("spintax collapses to one option and says it did", () => {
  const r = render("{Hi|Hello|Hey} there", VARS, "dacus");
  assert.match(r.text, /^(Hi|Hello|Hey) there$/);
  assert.equal(r.spun, true);
});

test("the same church spins the same way twice", () => {
  const a = render("{Hi|Hello|Hey} there", VARS, "dacus-church");
  const b = render("{Hi|Hello|Hey} there", VARS, "dacus-church");
  assert.equal(a.text, b.text, "a preview that re-rolled would hide template changes");
});

test("a merge tag is not mistaken for spintax", () => {
  const r = render("{{first_name|there}}", { first_name: "" }, "x");
  assert.equal(r.text, "there");
  assert.equal(r.spun, false);
});

/**
 * The link cases. A demo link is the entire payload of this campaign, and it is
 * written as anchor text — so "DEMO LINK" reads identically whether the href
 * behind it is a real demo or an empty string. The preview has to show the
 * destination or it is checking the one part that cannot break.
 */
test("a link shows its destination, not just its label", () => {
  const r = render('<a href="{{demo_link}}">DEMO LINK →</a>', VARS, "x");
  assert.equal(r.text, "DEMO LINK → (https://www.disciple.studio/c/dacus-church)");
});

test("a link whose href did not fill is caught, not hidden behind pretty text", () => {
  const r = render('<a href="{{demo_link}}">DEMO LINK</a>', { ...VARS, demo_link: "" }, "x");
  assert.match(r.text, /NO LINK/, "an empty href must be visible in the preview");
  assert.deepEqual(r.empty, ["demo_link"]);
});

test("an anchor with no href at all is reported as broken", () => {
  const r = render("<a>DEMO LINK</a>", VARS, "x");
  assert.equal(r.text, "DEMO LINK (NO LINK)");
});

test("a bare url link is not printed twice", () => {
  const r = render('<a href="https://x.org">https://x.org</a>', VARS, "x");
  assert.equal(r.text, "https://x.org");
});

test("light HTML reads as text", () => {
  const r = render("<p>Hi {{greeting}},</p><p>Take a look:<br/><a href='x'>here</a></p>", VARS, "x");
  assert.equal(r.text, "Hi Bo,\n\nTake a look:\nhere (x)");
});

test("entities are decoded", () => {
  const r = render("Sarah&#39;s &amp; Bo&nbsp;Cheatham", VARS, "x");
  assert.equal(r.text, "Sarah's & Bo Cheatham");
});

test("an empty template is empty, not a crash", () => {
  const r = render("", VARS, "x");
  assert.equal(r.text, "");
  assert.deepEqual(r.empty, []);
});

/**
 * An AI-SDR campaign's body is a single tag naming content Instantly generates
 * per lead. There is nothing to preview, and the honest answer is to flag it as
 * unknown rather than to render a blank email and call it fine.
 */
test("an AI-generated body slot is reported as unknown", () => {
  const r = render("{{6f8f7316-5429-4ffd-93e5-8acfd90a0108_email_1}}", VARS, "x");
  assert.equal(r.unknown.length, 1);
});
