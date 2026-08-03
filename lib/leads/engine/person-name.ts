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
