import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design-system skill: browser prototypes and a generated bundle, not app code.
    ".claude/**",
  ]),
  {
    rules: {
      // Allow _-prefixed variables when they exist only to omit keys from a rest spread
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Operational logging goes through src/lib/logger.ts (structured, searchable
    // in Vercel). A stray console.log is a leftover; tests may spy freely.
    files: ["src/**/*.{ts,tsx}", "middleware.ts"],
    ignores: ["src/__tests__/**"],
    rules: { "no-console": "error" },
  },
]);

export default eslintConfig;
