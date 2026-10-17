import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import svelte from "eslint-plugin-svelte";

export default [
  { ignores: ["dist/", ".wrangler/", "coverage/", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ["**/*.ts", "**/*.svelte"] })),
  ...svelte.configs.recommended,
  {
    files: ["**/*.svelte", "**/*.svelte.ts"],
    languageOptions: { globals: globals.browser, parserOptions: { parser: tseslint.parser } }
  },
  {
    files: ["src/**/*.js", "public/**/*.js"],
    languageOptions: { globals: globals.browser }
  },
  {
    files: ["public/sw.js"],
    languageOptions: { globals: globals.serviceworker }
  },
  {
    files: ["worker/**/*.js"],
    languageOptions: { globals: globals.serviceworker }
  },
  {
    files: ["test/**/*.js", "*.config.js"],
    // indexedDB lo pone fake-indexeddb en las pruebas
    languageOptions: { globals: { ...globals.node, indexedDB: "readonly" } }
  },
  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-empty": ["error", { allowEmptyCatch: true }]
    }
  },
  {
    files: ["**/*.ts", "**/*.svelte"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }]
    }
  }
];
