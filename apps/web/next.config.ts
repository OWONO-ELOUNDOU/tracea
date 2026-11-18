import { join } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Repository root, so the standalone layout (`apps/web/server.js`) does not depend on lockfiles
  // found above the checkout; the `web` image and the e2e stack both rely on it.
  outputFileTracingRoot: join(__dirname, "../.."),
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@tracea/domain"],
};

export default nextConfig;
