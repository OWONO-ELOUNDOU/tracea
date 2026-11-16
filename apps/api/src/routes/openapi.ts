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
        get: { summary: "Service health", responses: { "200": { description: "Service is up" } } },
      },
      "/auth/csrf": {
        get: { summary: "Issue a CSRF token", responses: { "200": { description: "Token" } } },
      },
      "/auth/register": {
        post: {
          summary: "Create an account",
          responses: { "201": { description: "Verification mail sent" } },
        },
      },
      "/auth/resend-verification": {
        post: {
          summary: "Resend the verification mail",
          responses: { "202": { description: "Accepted" } },
        },
      },
      "/auth/verify-email": {
        post: {
          summary: "Verify an e-mail address",
          responses: { "204": { description: "Verified" } },
        },
      },
      "/auth/login": {
        post: {
          summary: "Open a session",
          responses: { "200": { description: "User and session cookie" } },
        },
      },
      "/auth/logout": {
        post: {
          summary: "Close the current session",
          responses: { "204": { description: "Closed" } },
        },
      },
      "/auth/logout-all": {
        post: { summary: "Close every session", responses: { "204": { description: "Closed" } } },
      },
      "/auth/password/forgot": {
        post: {
          summary: "Request a password reset",
          responses: { "202": { description: "Accepted" } },
        },
      },
      "/auth/password/reset": {
        post: { summary: "Set a new password", responses: { "204": { description: "Updated" } } },
      },
      "/me": {
        get: { summary: "Current user", responses: { "200": { description: "User" } } },
        patch: { summary: "Update profile", responses: { "200": { description: "User" } } },
      },
    },
  }));
  done();
};
