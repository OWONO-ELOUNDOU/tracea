import { createConfig } from "@tracea/config/eslint";

export default [
  // Playwright outputs (HTML report with the trace viewer, failure artefacts).
  { ignores: ["playwright-report/**", "test-results/**"] },
  // End-to-end tests drive the app through the browser only; they never import application code.
  ...createConfig({
    tsconfigRootDir: import.meta.dirname,
    restrictedImports: ["@tracea/api", "@tracea/web", "@tracea/domain"],
  }),
];
