/**
 * Every unique sentence the console can show about a church, with how many
 * churches see it.
 *
 *   npm run leads:copy
 *
 * WHY THIS EXISTS
 *
 * The dossier's prose comes from two places that shadow each other, and reading
 * the code tells you neither which sentences actually occur nor how often. A
 * card renders `recordLabel(record[k].label) || answerLabel(k, answer)` — so the
 * pipeline's own per-church sentence WINS, and the label table underneath it may
 * be entirely dead in practice while looking live in the source. That is how
 * "Service times were not measured." survived a rewrite of the label table, and
 * it is why a copy review has to be done against the corpus rather than against
 * `vocab.generated.ts`.
 *
 * NO CHURCH DATA IN THE OUTPUT — ENFORCED, NOT INTENDED.
 *
 * The report is committed and this repository is public, so two rules are applied
 * mechanically rather than left to judgement:
 *
 *   1. Digits are normalised to `N`, so "3 services" and "4 services" are one
 *      case rather than eight.
 *   2. A sentence is only printed if at least `MIN_SHARED` churches say exactly
 *      it. Anything rarer is folded into a `<varies>` row carrying only the
 *      opening the whole group shares, and a count.
 *
 * Rule 2 is load-bearing, not belt-and-braces. Several pipeline labels embed the
 * church's own text — q8 writes "Probable app: <the app's name>", which is a
 * church name in all but title, across ~3,160 distinct wordings. Printing unique
 * sentences would have published a list of congregations. The rule makes that
 * structurally impossible: a printed sentence is one at least 25 congregations
 * share, so it cannot single one out.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { churchFromRecord } from "../lib/leads/engine/adapt.ts";
import { answerLabel, QTITLE, recordLabel, verdictWord } from "../lib/leads/engine/labels.ts";
import { colorState } from "../lib/leads/engine/color.ts";
import { defaultFavorModel } from "../lib/leads/engine/favor.ts";
import { staffPhrase } from "../lib/leads/engine/staff.ts";
import {
  APP_WEB_KEYS,
  REST_KEYS,
  type EngineCtx,
  type QuestionKey,
} from "../lib/leads/engine/types.ts";
import { loadAllRecords, loadIndex } from "../lib/leads/engine/tests/fixture.mts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT = resolve(ROOT, "docs/leads/copy-inventory.md");

/** A sentence must be this widely shared before it may be printed. */
const MIN_SHARED = 25;

/**
 * A group is TEMPLATED — the pipeline built each sentence out of the church's own
 * text — when many wordings share a long opening. Those groups are folded whole,
 * not just their rare members.
 *
 * `MIN_SHARED` alone is not enough here. q8 writes "Probable app: <name>", and
 * generic church names recur often enough that a few crossed the threshold and
 * got printed — a list of congregations, in a public file, technically within the
 * rule. This catches the shape instead of the frequency.
 *
 * Tuned to fold q8's "Probable app:" / "App found:" and to leave q5's
 * "Generic <vendor> login — not a custom portal" alone: that opening is 7
 * characters and the vendor IS the finding, so those rows are worth reading.
 */
const TEMPLATE_WORDINGS = 8;
const TEMPLATE_OPENING = 10;

/** Which dossier card each question is rendered as, in the order it appears. */
const CARDS: [QuestionKey, string][] = [
  ["q5", "Key findings · Custom login"],
  ...APP_WEB_KEYS.map((k) => [k, `App & Website · ${QTITLE[k]}`] as [QuestionKey, string]),
  ...REST_KEYS.map((k, i) => [k, `The rest · ${i + 1} · ${QTITLE[k]}`] as [QuestionKey, string]),
];

type Source = "record label" | "answer table";

interface Row {
  card: string;
  source: Source;
  answer: string;
  sentence: string;
  verdict: string;
  n: number;
}

const rows = new Map<string, Row>();

function tally(r: Omit<Row, "n">) {
  const sentence = r.sentence.replace(/\d+/g, "N");
  const key = [r.card, r.source, r.answer, sentence].join("  ");
  const hit = rows.get(key);
  if (hit) hit.n++;
  else rows.set(key, { ...r, sentence, n: 1 });
}

const index = loadIndex();
const ctx: EngineCtx = { overrides: {}, favor: defaultFavorModel(), rows: index };
const records = loadAllRecords();

for (const record of records) {
  const view = churchFromRecord(record);
  const rec = record as unknown as Record<string, { label?: unknown } | undefined>;

  for (const [k, card] of CARDS) {
    const q = view.q(k);
    const answer = String(q?.answer ?? "");
    const fromRecord = recordLabel(rec[k]?.label);
    const state = colorState(k, q, ctx);
    tally({
      card,
      source: fromRecord ? "record label" : "answer table",
      answer: answer || "(none)",
      sentence: fromRecord || answerLabel(k, answer || "unknown"),
      verdict: verdictWord(state, k),
    });
  }

  // q2 has no answer table at all — `staffPhrase` builds the sentence from the
  // claim kind, and the count inside it is normalised to N like every other.
  const staffState = colorState("q2", view.q("q2"), ctx);
  tally({
    card: "Key findings · Paid staff",
    source: "answer table",
    answer: String(view.q("q2")?.answer ?? "(none)"),
    sentence: staffPhrase(view.q("q2")),
    verdict: verdictWord(staffState, "q2"),
  });

  // Next steps and Discipleship are computed in the component, not looked up.
  tally({
    card: "Key findings · Next steps",
    source: "answer table",
    answer: view.steps.looked ? "looked" : "not looked",
    sentence: view.steps.looked ? "N/N Next Steps" : "Next Steps (pages not read)",
    verdict: "",
  });
  tally({
    card: "Key findings · Discipleship",
    source: "answer table",
    answer: view.pathway,
    sentence:
      view.pathway === "has"
        ? "N discipleship steps"
        : view.pathway === "none"
          ? "No pathway published"
          : "Not checked",
    verdict: "",
  });
}

/* ------------------------------------------------------------ the static prose */

/**
 * Sentences written in a component rather than derived from a church. Listed by
 * hand with their file:line because there is nothing to count — every church that
 * reaches the branch sees exactly this.
 */
const STATIC: [string, string, string][] = [
  ["Dossier", "…/dossier/Dossier.tsx:244", "This church's record could not be loaded."],
  ["Dossier", "…/dossier/Dossier.tsx:269", "(unnamed)"],
  ["Dossier · brand", "…/dossier/Dossier.tsx:278", "Only the homepage was read for branding; inner pages such as /about were not fetched."],
  ["Dossier · brand", "…/dossier/Dossier.tsx:280", "No slogan on the homepage"],
  ["Dossier · brand", "…/dossier/Dossier.tsx:283", "inner pages not read"],
  ["Dossier · brand", "…/dossier/Dossier.tsx:286", "No slogan found"],
  ["Dossier · visit", "…/dossier/Dossier.tsx:309", "no website URL on this record"],
  ["Dossier · visit", "…/dossier/Dossier.tsx:315", "church center ↗"],
  ["Dossier · notes", "…/dossier/Dossier.tsx:323", "Team notes — everyone can see these."],
  ["Dossier · section", "…/dossier/Dossier.tsx:327", "Key findings — the crucial fields, highest scrutiny"],
  ["Dossier · section", "…/dossier/Dossier.tsx:406", "App & Website"],
  ["Dossier · section", "…/dossier/Dossier.tsx:426", "The rest — lighter-touch signals"],
  ["Dossier · section", "…/dossier/Dossier.tsx:437", "Favorable lighter-touch signals — green = 1, light green = ½. A signal we never measured scores 0, so most churches cannot reach 4."],
  ["Dossier · pathway", "…/dossier/Dossier.tsx:516", "We read this church's site and found no published discipleship pathway."],
  ["Dossier · pathway", "…/dossier/Dossier.tsx:518", "We did not check this church for a discipleship pathway."],
  ["Dossier · pathway", "…/dossier/Dossier.tsx:554", "(unnamed step)"],
  ["Dossier · steps", "…/dossier/Dossier.tsx:601", "No next-step / discipleship pages were read for this church — its next steps are unknown, not absent."],
  ["Dossier · steps", "…/dossier/Dossier.tsx:657", "Not mentioned on the pages we read."],
  ["Dossier · steps", "…/dossier/Dossier.tsx:661", "Next-step pages were not read."],
  ["Evidence", "…/dossier/Evidence.tsx:141", "Our scrapers and extractors were not able to get adequate data to answer this question."],
  ["Evidence", "…/dossier/Evidence.tsx:142", "No further detail was recorded for this finding."],
  ["Evidence", "…/dossier/Evidence.tsx:186", "what the model claimed"],
  ["Evidence", "…/dossier/Evidence.tsx:196", "closest text actually on the page"],
  ["Evidence", "…/dossier/Evidence.tsx:205", "The claim could not be found on the page, so the answer is withheld."],
  ["Evidence", "…/dossier/Evidence.tsx:217", "verdict derived from the URL, not from page text"],
  ["Evidence", "…/dossier/Evidence.tsx:304", "matched markup"],
  ["List tile", "…/list/CrucialTiles.tsx:108", "the crucial fields checked with the highest scrutiny"],
  ["List tile · ChMS", "…/list/CrucialTiles.tsx:140", "No church management system was detected — not proof there is none"],
  ["List tile · ChMS", "…/list/CrucialTiles.tsx:143", "Not detected"],
  ["List tile · pathway", "…/list/CrucialTiles.tsx:61", "The church publishes a named discipleship pathway"],
  ["List tile · pathway", "…/list/CrucialTiles.tsx:63", "We read the site and it publishes no discipleship pathway"],
  ["List tile · pathway", "…/list/CrucialTiles.tsx:65", "We did not check this church for a discipleship pathway"],
  ["List tile · steps", "…/list/CrucialTiles.tsx:178", "Next-step pages were not read."],
  ["Profile", "…/dossier/ProfileBlock.tsx:133", "Taken from when each cached page was written. No fetch timestamp was recorded at crawl time."],
  ["Contact", "…/dossier/ContactBlock.tsx:105", "Best people to reach out to"],
  ["Contact", "…/dossier/ContactBlock.tsx:165", " · no email published"],
  ["Sub-signals", "lib/leads/engine/color.ts:104", "grey — every sub-signal is unmeasured"],
  ["Sub-signals", "lib/leads/engine/color.ts:103", "(N sub-signals unmeasured, not counted)"],
  ["Sub-signals", "lib/leads/engine/color.ts:108", "<state> — the sub-signals disagree: <label> is <state>; …"],
  ["Sub-signals", "lib/leads/engine/color.ts:109", "<state> — all measured sub-signals agree: <label> is <state>; …"],
];

/* --------------------------------------------------------------------- render */

const esc = (s: string) => s.replace(/\|/g, "\\|");
const fmt = (n: number) => n.toLocaleString("en-US");

function sharedOpening(sentences: string[]): string {
  if (!sentences.length) return "";
  let prefix = sentences[0];
  for (const s of sentences) {
    let i = 0;
    while (i < prefix.length && i < s.length && prefix[i] === s[i]) i++;
    prefix = prefix.slice(0, i);
    if (!prefix) break;
  }
  return prefix.trim();
}

/** Group by the case, then apply the print rule inside each group. */
const groups = new Map<string, Row[]>();
for (const r of rows.values()) {
  const key = [r.card, r.source, r.answer].join("  ");
  const g = groups.get(key);
  if (g) g.push(r);
  else groups.set(key, [r]);
}

interface Printed extends Row {
  varies: number;
}

const printed: Printed[] = [];
let foldedRows = 0;
let foldedChurches = 0;

for (const g of groups.values()) {
  const opening = sharedOpening(g.map((r) => r.sentence));
  const templated = g.length >= TEMPLATE_WORDINGS && opening.length >= TEMPLATE_OPENING;

  if (!templated) {
    for (const r of g.filter((x) => x.n >= MIN_SHARED)) printed.push({ ...r, varies: 0 });
  }

  const hidden = templated ? g : g.filter((x) => x.n < MIN_SHARED);
  if (!hidden.length) continue;
  foldedRows += hidden.length;
  const n = hidden.reduce((s, r) => s + r.n, 0);
  foldedChurches += n;
  const foldedOpening = templated ? opening : sharedOpening(hidden.map((r) => r.sentence));
  printed.push({
    ...hidden[0],
    sentence: foldedOpening ? `${foldedOpening} …` : "(varies)",
    n,
    varies: hidden.length,
  });
}

printed.sort((a, b) => (a.card < b.card ? -1 : a.card > b.card ? 1 : b.n - a.n));

const out: string[] = [];
out.push("# Dossier copy — every unique case");
out.push("");
out.push(
  `Generated by \`npm run leads:copy\` over ${fmt(records.length)} churches. ` +
    `Sentences and counts only — no church names, ids or quoted page text, because ` +
    `this file is committed and the repository is public.`,
);
out.push("");
out.push("Two normalisations, both mechanical:");
out.push("");
out.push("- digits are shown as `N`, so a count is one case rather than twenty;");
out.push(
  `- a wording fewer than ${MIN_SHARED} churches share is folded into one row ` +
    `carrying only the opening they share. Several pipeline labels embed the ` +
    `church's own text (q8 writes "Probable app: &lt;name&gt;"), so this is what keeps ` +
    `the file free of congregations rather than a matter of care. ` +
    `${fmt(foldedRows)} wordings covering ${fmt(foldedChurches)} churches are folded.`,
);
out.push("");
out.push("## How to read **source**");
out.push("");
out.push(
  "- **record label** — the pipeline wrote this sentence into the church's own record. " +
    "It WINS over the table, so editing `ANSWER_LABEL` does nothing to these rows; " +
    "they are repaired in `recordLabel()` (`lib/leads/engine/labels.ts`).",
);
out.push(
  "- **answer table** — no per-church label, so the card falls back to " +
    "`ANSWER_LABEL` / `ANSWER_LABEL_PATCH`. The same strings are what the filter rail shows.",
);
out.push("");
out.push("## Per-church cards");
out.push("");
out.push("| card | source | answer | sentence | verdict word | churches |");
out.push("|---|---|---|---|---|---:|");
for (const r of printed) {
  out.push(
    `| ${esc(r.card)} | ${r.source} | \`${esc(r.answer)}\` | ${esc(r.sentence)}` +
      `${r.varies ? ` *(${fmt(r.varies)} wordings)*` : ""} | ${esc(r.verdict)} | ${fmt(r.n)} |`,
  );
}

out.push("");
out.push("## Table wordings no card reaches");
out.push("");
out.push(
  "Answers whose `ANSWER_LABEL` wording never appears on a dossier card, because " +
    "every church carrying that answer also carries its own label. They are still " +
    "live in the **filter rail**, which always uses the table.",
);
out.push("");
const liveOnCard = new Set(
  printed.filter((r) => r.source === "answer table").map((r) => `${r.card}  ${r.answer}`),
);
const dead = new Set<string>();
for (const [k, card] of CARDS) {
  for (const r of printed) {
    if (r.card !== card || r.answer === "(none)") continue;
    if (liveOnCard.has(`${card}  ${r.answer}`)) continue;
    dead.add(`| ${esc(card)} | \`${esc(r.answer)}\` | ${esc(answerLabel(k, r.answer))} |`);
  }
}
out.push("| card | answer | table wording (rail only) |");
out.push("|---|---|---|");
out.push(...[...dead].sort());

out.push("");
out.push("## Fixed prose (written in a component, not derived from a church)");
out.push("");
out.push("| where | file | sentence |");
out.push("|---|---|---|");
for (const [where, file, sentence] of STATIC) {
  out.push(`| ${esc(where)} | \`${esc(file)}\` | ${esc(sentence)} |`);
}
out.push("");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${out.join("\n")}\n`);

console.log(
  `leads:copy — ${printed.length} printed cases (${foldedRows} wordings folded), ` +
    `${STATIC.length} fixed\n           → ${OUT.slice(ROOT.length + 1).replace(/\\/g, "/")}`,
);
