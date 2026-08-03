/**
 * A staff member's name, reduced to the word you would greet them by.
 *
 * IN THE ENGINE, NOT IN `lib/generateDemo.ts` WHERE ITS ONLY CALLER LIVES.
 * That file imports `@/components/templates`, and `node --test` resolves no path
 * alias, so nothing in it can be covered by a test — a constraint
 * `demo-export.test.mts` records at the top of its own file. This rule is wrong
 * on a fifth of the corpus if it is wrong at all, and a rule that decides what
 * 15,273 demo pages call a person by name is not one to leave untested.
 *
 * No imports, deliberately. It stays reachable from both worlds.
 */

/**
 * Leading tokens that are not a given name, however many of them there are.
 *
 * Church staff directories lead with the honorific far more often than anybody
 * expects: 549 of the 2,722 churches with a named rank-1 recommended contact —
 * one in five — start with one of these. `Rev.` 272, `Dr.` 115, `Pastor` 87,
 * `Fr.` 25, and a long tail including the shouted forms the corpus takes
 * verbatim from pages set in uppercase.
 *
 * A BARE INITIAL IS HERE FOR THE SAME REASON. "J. Michael Carter" cut to "J."
 * greets somebody with a letter, which is worse than greeting them with the
 * wrong word — at least a wrong word looks like a mistake.
 *
 * `st` is in the list for "St." (Sr./Fr. territory) and is a real risk only for
 * a first name spelled exactly "St", which is not a name.
 */
const NOT_A_GIVEN_NAME =
  /^(rev|revd|reverend|dr|doctor|ps|pr|pastor|fr|father|br|bro|brother|sr|sister|mr|mrs|ms|miss|mx|elder|bishop|deacon|deaconess|min|minister|apostle|prophet|evangelist|chaplain|canon|dcn|st|sen|jr|ii|iii|[a-z])\.?$/i;

/**
 * THE FIRST TOKEN THAT IS ACTUALLY A GIVEN NAME, or `""` if there is none.
 *
 * Every leading title is dropped rather than just one, because "Rev. Dr. Karen
 * Webb" is a real shape in this data. `""` is a real answer: the corpus contains
 * contacts recorded as nothing but "Pastor", and the caller is expected to fall
 * back to its default rather than greet an empty string.
 *
 * IT DOES NOT CHANGE THE CASE. That is `properCase`'s job at the call site, and
 * keeping them apart is what makes this one testable without the template
 * registry.
 */
export function givenName(full: string): string {
  for (const token of full.trim().split(/\s+/)) {
    // Strip surrounding punctuation before testing, so "(Rev.)" and "Rev," are
    // recognised as titles too. A trailing dot is KEPT, because it is most of
    // what marks an abbreviation, and an interior hyphen or apostrophe is kept
    // because "Jean-Luc" and "O'Brien" are given names.
    const bare = token.replace(/^[^\p{L}]+|[^\p{L}.]+$/gu, "");
    if (bare && !NOT_A_GIVEN_NAME.test(bare)) return bare;
  }
  return "";
}

/**
 * A first name as it should be READ ALOUD, because the demo greets somebody with
 * it: "Welcome back, Mark."
 *
 * The corpus takes staff names as the page spelled them, and church websites
 * shout: 5,291 of 164,370 named contacts have an ALL-CAPS first name (staff
 * directories set in uppercase), and 739 are entirely lowercase. Passed through,
 * those become "Welcome back, MARK." and "Welcome back, alex." on a page being
 * sent to that person's own church.
 *
 * TWO RULES, AND THE SECOND IS THE CAREFUL ONE.
 *
 *  · ALL CAPS is a styling decision on their website, not a spelling, so it is
 *    undone: `MARK` -> `Mark`.
 *  · Anything else has only its FIRST LETTER raised, and the rest is left
 *    exactly as given: `alex` -> `Alex`, while `McKenzie`, `DeShawn` and
 *    `O'Brien` keep the capitals a person chose. Title-casing the whole token
 *    would "fix" those into `Mckenzie` and `Deshawn`, which is a different way
 *    of getting somebody's name wrong.
 *
 * Not a general name formatter, and deliberately not applied to surnames or
 * contact lists — this is the one string a demo says TO a reader.
 *
 * IT MOVED HERE FROM `lib/generateDemo.ts` so the review card can show the exact
 * word the demo will use. That file imports the React template registry, so a
 * client component importing it would pull the templates into the leads bundle —
 * and `node --test` cannot reach it either, which is the argument this file's
 * header already makes for `givenName`.
 */
export function properCase(word: string): string {
  if (!word) return "";
  const shouted = word.length > 1 && word === word.toUpperCase() && word !== word.toLowerCase();
  const rest = shouted ? word.slice(1).toLowerCase() : word.slice(1);
  return word[0].toUpperCase() + rest;
}

/**
 * The stock demo member's given name, for a church with nobody to greet.
 *
 * HERE RATHER THAN ONLY IN `generateDemo.ts`, because the review card has to
 * show it — and has to be able to say "default" beside it — without importing
 * that file's template registry. `DEMO_MEMBER` still owns the rest of the
 * fictional person; this is the one field two worlds need.
 */
export const DEMO_MEMBER_FIRST_NAME = "Sarah";

/** The shape `demoGreeting` reads. Only the fields it needs are named. */
export interface GreetablePerson {
  name?: string;
  rank?: number;
}

export interface Greeting {
  /** The word the demo will address them by. Never empty. */
  name: string;
  /** Nobody usable was found, so this is the stock demo member's name. */
  isDefault: boolean;
}

/**
 * THE NAME THE DEMO WILL ACTUALLY GREET THEM BY, and why it matters that this is
 * one function.
 *
 * The review card shows this to a reviewer as a promise about the page a church
 * is going to receive. If the card computed it even slightly differently from
 * the demo — say by reading the first contact on screen rather than the first
 * one with a usable name — the promise would be false exactly when it mattered,
 * on the churches whose data is odd. So `demoFirstName` in `generateDemo.ts`
 * calls this too, and there is no second copy of the rule.
 *
 * THE SKIP IS THE SUBTLE PART. Lowest `rank` wins, ties keep source order, and
 * anyone with a blank name is passed over — which is not a detail: rank 1 can be
 * a church office address, or a person whose name a reviewer just cleared, and
 * in both cases the demo walks on down the list rather than greeting nobody.
 */
export function demoGreeting(
  people: readonly GreetablePerson[] | null | undefined,
  fallback: string,
): Greeting {
  if (!Array.isArray(people)) return { name: fallback, isDefault: true };

  let best: GreetablePerson | undefined;
  let bestRank = Infinity;
  for (const p of people) {
    if (!(p?.name ?? "").trim()) continue;
    const rank = typeof p?.rank === "number" ? p.rank : Infinity;
    if (rank < bestRank) {
      bestRank = rank;
      best = p;
    }
  }

  const first = givenName(best?.name ?? "");
  // `""` is a real answer from `givenName` — a contact recorded as nothing but
  // "Pastor" — and it falls back rather than greeting an empty string.
  return first ? { name: properCase(first), isDefault: false } : { name: fallback, isDefault: true };
}
