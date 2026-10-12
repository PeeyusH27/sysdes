import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Problem solutions and cheat sheet snippets are scripts: the function is called by the runner, not this file.
  // Some cheat sheet snippets show buggy code on purpose (e.g. an arrow function with braces and no return).
  { files: ["content/dsa/problems/**/*.js", "content/dsa/js/snippets/**/*.js"], rules: { "@typescript-eslint/no-unused-vars": "off", "@typescript-eslint/no-unused-expressions": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
