import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

/**
 * Dependency rule: `domain` depends on nothing; every other package depends on `domain`.
 * `restrictedImports` lists the packages a given package must never import.
 */
export function createConfig({ tsconfigRootDir, restrictedImports = [] }) {
  return tseslint.config(
    {
      ignores: [
        "dist/**",
        ".next/**",
        "node_modules/**",
        "coverage/**",
        "*.config.js",
        "*.config.mjs",
        "*.config.ts",
        "next-env.d.ts",
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      plugins: { import: importPlugin },
      rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
          },
        ],
        // With noUncheckedIndexedAccess, `as T` on a checked index read is the explicit form.
        "@typescript-eslint/non-nullable-type-assertion-style": "off",
        "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
        "import/no-cycle": "error",
        "no-restricted-imports":
          restrictedImports.length > 0 ? ["error", { patterns: restrictedImports }] : "off",
      },
    },
    {
      files: ["test/**", "**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
      },
    },
    prettier,
  );
}
