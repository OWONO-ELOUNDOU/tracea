import type { FastifyPluginCallback } from "fastify";

/**
 * Placeholder document until the Zod-to-OpenAPI generation lands with the first business routes.
 * Keeping the endpoint from sprint 0 lets the web client and the CI contract job rely on it.
 */
export const openapiRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get("/v1/openapi.json", () => ({
    openapi: "3.1.0",
    info: { title: "Tracea API", version: "0.1.0" },
    paths: {
      "/health": {
        get: {
          summary: "Service health",
          responses: { "200": { description: "Service is up" } },
        },
      },
    },
  }));
  done();
};
