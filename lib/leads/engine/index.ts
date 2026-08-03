/**
 * The Lead Console engine — the only specifier app code should import.
 *
 * Ported from `lead-console-instructions/reference/core.js`. The scoring and
 * citation layer is copied verbatim, comments included: it encodes the
 * fail-toward-unknown / cite-every-yes contract, several of its comments record
 * a real incident, and `tests/golden.test.mts` is what proves the port survived.
 */

export * from "./types.ts";
export * from "./adapt.ts";
export * from "./color.ts";
export * from "./staff.ts";
export * from "./steps.ts";
export * from "./favor.ts";
export * from "./filter.ts";
export * from "./platform.ts";
export * from "./region.ts";
export * from "./labels.ts";
export * from "./url.ts";
export { VOCAB } from "./vocab.generated.ts";
