/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source: `fixture/vocab.json`, itself produced by EXECUTING the real
 * `core.js`. Regenerate with `npm run leads:gen`.
 *
 * There is exactly ONE source of truth for (question, answer) -> colour, and
 * this is downstream of it. Editing this file by hand re-creates the incident
 * the rule was written for: a second, drifting copy of the colour table that
 * greyed out every Q3 and Q7 cell and silently dropped q9/q10/q12 — in the
 * variant that shipped.
 *
 * Provenance recorded by the generator:
 * (none recorded)
 */

export const VOCAB = {
  QMETA: [
    [
      "q1",
      "Q1",
      "Organized Discipleship Pathway"
    ],
    [
      "q2",
      "Q2",
      "Number of Paid Staff"
    ],
    [
      "q3",
      "Q3",
      "Concrete Next Steps"
    ],
    [
      "q4",
      "Q4",
      "Small Group Feature"
    ],
    [
      "q5",
      "Q5",
      "Member Login Feature"
    ],
    [
      "q6",
      "Q6",
      "Convenient Giving Feature"
    ],
    [
      "q7",
      "Q7",
      "Independent Website"
    ],
    [
      "q8",
      "Q8",
      "iOS Native App"
    ],
    [
      "q9",
      "Q9",
      "Service Times"
    ],
    [
      "q10",
      "Q10",
      "Branches/Campuses"
    ]
  ],
  QSHORT: {
    "q1": "Pathway",
    "q2": "Staff",
    "q3": "Steps",
    "q4": "Groups",
    "q5": "Login",
    "q6": "Giving",
    "q7": "Website",
    "q8": "App",
    "q9": "Times",
    "q10": "Campuses",
    "q12": "Tech"
  },
  ANSWER_LABEL: {
    "q1": {
      "yes": "Has organized pathway",
      "implicit": "Implicit (next steps, no label)",
      "ambiguous": "Generic discipleship language",
      "no": "No pathway (confirmed)",
      "unverified": "Unverified claim",
      "unknown": "Not measured"
    },
    "q3": {
      "convenient": "Has convenient way to act",
      "partial_flow": "Registrations area only",
      "no_flow": "No convenient way to act",
      "unknown": "Not measured"
    },
    "q4": {
      "cc_module": "Church Center Groups module",
      "cc_groups_page": "Church Center groups page",
      "cc_module_empty": "Module on, but no groups",
      "groups_none_open": "Groups page, none open",
      "own_finder": "Own-site group finder",
      "own_page": "Own groups page (no finder)",
      "no_groups": "No groups feature",
      "unknown": "Not fetched"
    },
    "q5": {
      "custom_confirmed": "Custom login/portal (confirmed)",
      "custom_candidate": "Possible custom login (needs check)",
      "generic_cc": "Generic third-party login",
      "no_login_link": "No login link found",
      "generic_login": "Generic Church Center login",
      "unknown": "Not measured"
    },
    "q6": {
      "convenient": "Convenient giving",
      "external_handoff": "External giving hand-off",
      "unknown": "Not measured"
    },
    "q7": {
      "cc_default": "Church Center default site",
      "clunky": "Clunky site",
      "dated": "Dated site",
      "modern": "Modern site",
      "bare": "Bare site",
      "unmeasured": "Not measured"
    },
    "q8": {
      "has_app": "Has an app",
      "no_app": "No custom app",
      "no_app_found": "No app found",
      "likely_yes": "Probable app (unconfirmed)",
      "ambiguous": "Ambiguous name match",
      "unknown": "Not measured"
    },
    "q9": {
      "published": "Publishes service times",
      "not_published": "No service time found",
      "unknown": "Not measured"
    },
    "q10": {
      "multisite": "Multiple campuses",
      "single_site": "One campus",
      "unknown": "Unknown"
    }
  },
  COLOR_DEFAULTS: {
    "q1": {
      "yes": "good",
      "implicit": "good",
      "implicit_uncited": "warn",
      "ambiguous": "good2",
      "no": "bad",
      "unverified": "unver",
      "unknown": "unk"
    },
    "q2": null,
    "q3": null,
    "q4": null,
    "q5": {
      "custom_confirmed": "bad",
      "custom_candidate": "unver",
      "generic_cc": "good2",
      "no_login_link": "good",
      "generic_login": "good2",
      "unknown": "unk"
    },
    "q6": null,
    "q7": {
      "cc_default": "good",
      "clunky": "good",
      "dated": "good2",
      "bare": "warn",
      "modern": "bad",
      "unmeasured": "unk"
    },
    "q8": {
      "has_app": "bad",
      "no_app": "good",
      "no_app_found": "good2",
      "likely_yes": "unver",
      "ambiguous": "warn",
      "unknown": "unk"
    },
    "q9": null,
    "q10": null,
    "q12": null
  },
  VALID_STATES: [
    "good",
    "good2",
    "warn",
    "bad2",
    "bad",
    "unk",
    "unver"
  ],
  STEP_CATS: [
    [
      "connect",
      "Connect / get started"
    ],
    [
      "baptism",
      "Baptism"
    ],
    [
      "group",
      "Small groups"
    ],
    [
      "classes",
      "Classes / courses"
    ],
    [
      "membership",
      "Membership"
    ],
    [
      "serve",
      "Serving"
    ],
    [
      "giving",
      "Giving"
    ],
    [
      "other",
      "Other next steps"
    ]
  ],
  STAFF_TIER_DEFAULTS: [
    {
      "lo": 0,
      "hi": 10,
      "pts": 0
    },
    {
      "lo": 11,
      "hi": 25,
      "pts": 1
    },
    {
      "lo": 26,
      "hi": 40,
      "pts": 2
    },
    {
      "lo": 41,
      "hi": 59,
      "pts": 1
    },
    {
      "lo": 60,
      "hi": null,
      "pts": 0
    }
  ],
  FAVOR_DEFAULTS: {
    "staffTiers": [
      {
        "lo": 0,
        "hi": 10,
        "pts": 0
      },
      {
        "lo": 11,
        "hi": 25,
        "pts": 1
      },
      {
        "lo": 26,
        "hi": 40,
        "pts": 2
      },
      {
        "lo": 41,
        "hi": 59,
        "pts": 1
      },
      {
        "lo": 60,
        "hi": null,
        "pts": 0
      }
    ],
    "loginPts": 0.5,
    "websitePts": 1,
    "appPts": 0.5,
    "stepCat": {
      "connect": 0.3125,
      "baptism": 0.3125,
      "group": 0.3125,
      "classes": 0.3125,
      "membership": 0.3125,
      "serve": 0.3125,
      "giving": 0.3125,
      "other": 0.3125
    }
  },
  SORT_OPTS: [
    [
      "opp",
      "most in your favor"
    ],
    [
      "steps",
      "most next steps"
    ],
    [
      "name",
      "name (A–Z)"
    ],
    [
      "paid",
      "paid staff (most)"
    ],
    [
      "state",
      "state (A–Z)"
    ],
    [
      "scraped",
      "recently scraped"
    ]
  ],
  BACKEND_NAME: {
    "church_center": "Church Center",
    "subsplash": "Subsplash",
    "tithely": "Tithe.ly",
    "breeze": "Breeze",
    "realm": "Realm",
    "ccb": "Church Community Builder",
    "elvanto": "Elvanto"
  },
  SUBDIV_LABEL: {
    "USA": "state",
    "Canada": "province",
    "Australia": "state",
    "United Kingdom": "nation",
    "Ireland": "county",
    "Germany": "state",
    "France": "region"
  },
  STATE_PHRASE: {
    "good": "in your favor",
    "good2": "somewhat in your favor",
    "bad": "not in your favor",
    "bad2": "leans not in your favor",
    "warn": "worth a look",
    "unk": "unmeasured",
    "unver": "unverified — manual check"
  },
} as const;
