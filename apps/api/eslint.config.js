import { createConfig } from "@tracea/config/eslint";

export default createConfig({
  tsconfigRootDir: import.meta.dirname,
  restrictedImports: ["@tracea/web", "@tracea/ui", "@tracea/rendering-*"],
});
