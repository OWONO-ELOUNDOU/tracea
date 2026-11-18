import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Each test file starts its own embedded PostgreSQL; start-up alone can exceed the default 10 s
    // when several files run in parallel.
    hookTimeout: 60_000,
  },
});
