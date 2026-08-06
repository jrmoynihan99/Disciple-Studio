/**
 * THE SANITISER, FIRED AT WITH REAL BYPASSES.
 *
 * DOMPurify is already tested upstream. What is NOT tested upstream is OUR
 * configuration — the tag allow-list, the URI scheme regexp, and the hook that
 * rewrites anchors. A policy can be wrong while the library is right, and every
 * hole this file guards came from a policy mistake rather than a library one.
 *
 * Run against jsdom so the same config the browser uses is exercised here. The
 * browser module (`lib/leads/client/sanitize.ts`) cannot be imported directly —
 * it resolves DOMPurify against `window` — so this rebuilds the identical setup
 * from the shared policy, which is exactly why the policy is a separate module.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import { SANITIZE_CONFIG, decorateAnchor } from "../engine/sanitize-policy.ts";

const purify = createDOMPurify(new JSDOM("").window as unknown as Window & typeof globalThis);
purify.addHook("afterSanitizeAttributes", decorateAnchor);
const clean = (html: string) => purify.sanitize(html, SANITIZE_CONFIG) as unknown as string;

test("formatting survives, so the preview looks like the email", () => {
  const out = clean("<p>Hi Bo,</p><p>Every member sees <strong>THEIR</strong> next step.</p>");
  assert.match(out, /<strong>THEIR<\/strong>/);
  assert.match(out, /Hi Bo,/);
});

test("a link stays clickable, opens a new tab, and cannot reach its opener", () => {
  const out = clean('<a href="https://www.disciple.studio/c/dacus-church">DEMO LINK</a>');
  assert.match(out, /href="https:\/\/www\.disciple\.studio\/c\/dacus-church"/);
  assert.match(out, /target="_blank"/);
  assert.match(out, /rel="noopener noreferrer"/);
  assert.match(out, /title="https:\/\/www\.disciple\.studio\/c\/dacus-church"/, "hover must reveal the destination");
});

/**
 * The bypass that defeated the hand-rolled version. A browser decodes entities
 * in an attribute BEFORE resolving the URL, so a check against the raw string
 * sees `javascript&#58;` — no colon, no match — and lets it through.
 */
test("entity-encoded and obfuscated javascript schemes are all refused", () => {
  const attacks = [
    "javascript:alert(1)",
    "javascript&#58;alert(1)",
    "javascript&#x3a;alert(1)",
    "javascript&colon;alert(1)",
    "java&#115;cript:alert(1)",
    "&#106;avascript:alert(1)",
    "jav\tascript:alert(1)",
    "jav\nascript:alert(1)",
    "jav\rascript:alert(1)",
    "  javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "javascript:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  ];
  for (const bad of attacks) {
    const out = clean(`<a href="${bad}">click</a>`);
    assert.doesNotMatch(out, /javascript|vbscript|data:/i, `must not survive: ${JSON.stringify(bad)}`);
    assert.match(out, /click/, "the link text still renders");
  }
});

test("the schemes an email legitimately uses still work", () => {
  for (const good of [
    "https://www.disciple.studio/c/x",
    "http://localhost:3000/c/x",
    "mailto:jason@disciples.studio",
    "tel:+19785909137",
    "/c/relative-path",
    "c/also-relative",
  ]) {
    const out = clean(`<a href="${good}">click</a>`);
    assert.match(out, /href=/, `${good} should survive`);
  }
});

test("script tags are removed with their contents", () => {
  const out = clean("<p>hi</p><script>alert(1)</script><p>bye</p>");
  assert.doesNotMatch(out, /script|alert/i);
  assert.match(out, /hi/);
  assert.match(out, /bye/);
});

test("event handler attributes never survive", () => {
  const out = clean(`<div onclick="alert(1)" onmouseover='x()'>text</div><img src=x onerror="alert(1)">`);
  assert.doesNotMatch(out, /onclick|onmouseover|onerror/i);
  assert.match(out, /text/);
});

test("iframes, forms and inputs are removed", () => {
  const out = clean('<iframe src="https://evil.test"></iframe><form><input name="x"></form><p>ok</p>');
  assert.doesNotMatch(out, /iframe|<form|<input/i);
  assert.match(out, /ok/);
});

/**
 * Mutation XSS — markup that parses into something different from how it reads.
 * This is the class a regex sanitiser cannot reason about at all, and the reason
 * the hand-rolled version had to go.
 */
test("malformed and nested markup cannot smuggle a tag through", () => {
  for (const attack of [
    "<scr<script>ipt>alert(1)</script>",
    '<svg><script>alert(1)</script></svg>',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    '<a href="javascript:alert(1)"><b>x</b></a>',
  ]) {
    const out = clean(attack);
    /**
     * THE ASSERTION IS ABOUT TAGS AND ATTRIBUTES, NOT ABOUT THE WORD "alert".
     *
     * `<scr<script>ipt>alert(1)</script>` sanitises to the TEXT `ipt&gt;alert(1)`
     * — the tag is gone and what is left is escaped content that renders as
     * characters on a page. An assertion that banned the substring would fail on
     * a correct result and, worse, would teach the next reader that inert text is
     * a finding.
     */
    assert.doesNotMatch(out, /<\s*script/i, `a script tag survived: ${attack}`);
    assert.doesNotMatch(out, /\son[a-z]+\s*=/i, `an event handler survived: ${attack}`);
    assert.doesNotMatch(out, /javascript\s*:/i, `a javascript: url survived: ${attack}`);
    assert.doesNotMatch(out, /<\s*(svg|math|noscript|style)/i, `an unlisted tag survived: ${attack}`);
  }
});

test("a base tag cannot be used to re-point every relative link", () => {
  const out = clean('<base href="https://evil.test/"><a href="/c/x">click</a>');
  assert.doesNotMatch(out, /<base/i);
});

test("unknown tags are dropped but their text is kept", () => {
  const out = clean("<marquee>hello</marquee><custom-el>world</custom-el>");
  assert.doesNotMatch(out, /marquee|custom-el/i);
  assert.match(out, /hello/);
  assert.match(out, /world/);
});

test("empty input is empty, not a crash", () => {
  assert.equal(clean(""), "");
});
