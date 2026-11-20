import { join } from "node:path";
import type { NextConfig } from "next";

// Same default as the API client (`src/lib/api.ts`). Read at build time: the CSP is baked into the
// build, so an image built for one API origin only talks to that origin.
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").origin;

// First step (decision D27): no `script-src`, since Next.js inlines its bootstrap scripts and a
// strict policy needs a per-request nonce. No `default-src` either, for the same reason.
const contentSecurityPolicy = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  `connect-src 'self' ${apiOrigin}`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Browsers ignore HSTS over plain HTTP, so the production build can still be served locally.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Repository root, so the standalone layout (`apps/web/server.js`) does not depend on lockfiles
  // found above the checkout; the `web` image and the e2e stack both rely on it.
  outputFileTracingRoot: join(__dirname, "../.."),
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@tracea/domain"],
  headers: () => Promise.resolve([{ source: "/:path*", headers: securityHeaders }]),
};

export default nextConfig;
