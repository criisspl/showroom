import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/", ".wrangler/", "coverage/"] },
  js.configs.recommended,
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
  }
];
