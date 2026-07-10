import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".agent/**",
      "dist/**",
      "coverage/**",
      "docs/.vitepress/dist/**",
      "docs/.vitepress/cache/**",
      "node_modules/**",
      "test-results/**",
      "browser-benchmark-results.json",
      "benchmark-results.json",
      "bundle-size-report.json",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs,cjs,js}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-case-declarations": "off",
      "no-useless-assignment": "off",
      "prefer-const": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["src/vue/**/*.test.ts", "src/bindings/**/*.test.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/react/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
);
