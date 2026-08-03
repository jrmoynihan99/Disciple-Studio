/**
 * Generate `lib/leads/engine/vocab.generated.ts` from the handoff fixture's
 * `vocab.json`.
 *
 *   npm run leads:gen
 *
 * WHY THIS IS GENERATED RATHER THAN TYPED
 *
 * `vocab.json` was produced by EXECUTING the real `core.js`, so it cannot drift
 * from the engine that made it. The handoff is explicit that this table has
 * exactly one source of truth, and names the incident behind the rule: a retired
 * template kept its own inline copy of `colorState`/`QMETA`, the copy drifted,
 * and it greyed out every Q3 and Q7 cell and dropped q9/q10/q12 entirely. It was
 * the DEFAULT variant, so the file that shipped was the broken one.
 *
 * It is generated-and-committed rather than imported at runtime because the app
 * needs the vocabulary in production, where the fixture directory does not
 * exist. `as const` also buys the literal unions in `types.ts` for free.
 *
 * This script transcribes. It does not fix, extend, or reword anything — the
 * one known gap in the source table (`q1: implicit_uncited` has a colour rule
 * but no label) is corrected in `labels.ts` as a named, visible layer, so the
 * generated file stays provably faithful to what `core.js` emitted.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const PACK = resolve(ROOT, process.env.LEADS_PACK_DIR ?? "data/leads/pack");
const SRC = resolve(PACK, "dev/vocab.json");
const OUT = resolve(ROOT, "lib/leads/engine/vocab.generated.ts");

/** Every key the engine reads. A missing one is a hard error, never a default. */
const REQUIRED = [
  "QMETA",
  "QSHORT",
  "ANSWER_LABEL",
  "COLOR_DEFAULTS",
  "VALID_STATES",
  "STEP_CATS",
  "STAFF_TIER_DEFAULTS",
  "FAVOR_DEFAULTS",
  "SORT_OPTS",
  "BACKEND_NAME",
  "SUBDIV_LABEL",
  "STATE_PHRASE",
] as const;

const raw = readFileSync(SRC, "utf8");
const vocab = JSON.parse(raw) as Record<string, unknown>;

const missing = REQUIRED.filter((k) => vocab[k] == null);
if (missing.length) {
  throw new Error(
    `${SRC} is missing required key(s): ${missing.join(", ")}. ` +
      `Regenerate it from core.js rather than patching it by hand.`,
  );
}

// Emit in a fixed key order so a regeneration produces a reviewable diff rather
// than a reshuffle.
const body = REQUIRED.map(
  (k) => `  ${k}: ${JSON.stringify(vocab[k], null, 2).replace(/\n/g, "\n  ")},`,
).join("\n");

const out = `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source: \`fixture/vocab.json\`, itself produced by EXECUTING the real
 * \`core.js\`. Regenerate with \`npm run leads:gen\`.
 *
 * There is exactly ONE source of truth for (question, answer) -> colour, and
 * this is downstream of it. Editing this file by hand re-creates the incident
 * the rule was written for: a second, drifting copy of the colour table that
 * greyed out every Q3 and Q7 cell and silently dropped q9/q10/q12 — in the
 * variant that shipped.
 *
 * Provenance recorded by the generator:
 * ${String(vocab._generated_by ?? "(none recorded)")}
 */

export const VOCAB = {
${body}
} as const;
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out, "utf8");

const qmeta = vocab.QMETA as unknown[];
const states = vocab.VALID_STATES as unknown[];
console.log(
  `leads:gen → ${OUT}\n` +
    `  ${qmeta.length} questions · ${states.length} verdict states · ` +
    `${Object.keys(vocab.ANSWER_LABEL as object).length} label groups`,
);
