import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Lead Console handoff: reference source we PORT FROM but never ship.
    // It is a single 764 KB HTML file plus the original `core.js`, written as a
    // no-build-step deliverable, so it trips ~60 rules by design. It is also
    // gitignored (real church data), and flat config does not read .gitignore.
    "lead-console-instructions/**",
  ]),
]);

export default eslintConfig;
