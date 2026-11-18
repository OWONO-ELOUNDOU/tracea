import type { FastifyPluginCallback } from "fastify";

import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_LIST_DEFAULT_LIMIT,
  PROJECT_LIST_MAX_LIMIT,
  PROJECT_NAME_MAX_LENGTH,
} from "../projects/service.js";

const json = (schema: object) => ({ "application/json": { schema } });
const problemResponse = (description: string) => ({
  description,
  content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } },
});
const common = {
  "401": { $ref: "#/components/responses/Unauthenticated" },
  "429": { $ref: "#/components/responses/RateLimited" },
};
const mutation = { ...common, "403": { $ref: "#/components/responses/CsrfInvalid" } };
const csrfHeader = { $ref: "#/components/parameters/CsrfToken" };
const idParameter = { $ref: "#/components/parameters/ProjectId" };
const notFound = { "404": { $ref: "#/components/responses/ProjectNotFound" } };
const validation = { "422": { $ref: "#/components/responses/ValidationError" } };
const projectEnvelope = {
  type: "object",
  required: ["project"],
  additionalProperties: false,
  properties: { project: { $ref: "#/components/schemas/ProjectDetail" } },
};
const projectCreated = {
  description: "Project created",
  headers: { Location: { schema: { type: "string" }, description: "/projects/{id}" } },
  content: json(projectEnvelope),
};
const isoDate = { type: "string", format: "date-time" };
const projectName = {
  type: "string",
  minLength: 1,
  maxLength: PROJECT_NAME_MAX_LENGTH,
  description: "Trimmed; control characters are refused. Duplicates are allowed.",
};

const components = {
  parameters: {
    CsrfToken: {
      name: "X-CSRF-Token",
      in: "header",
      required: true,
      description: "Must equal the tracea_csrf cookie.",
      schema: { type: "string" },
    },
    ProjectId: {
      name: "id",
      in: "path",
      required: true,
      description: "Opaque identifier. A malformed value answers 404 PROJECT_NOT_FOUND.",
      schema: { type: "string" },
    },
  },
  schemas: {
    Problem: {
      type: "object",
      required: ["type", "title", "status", "code"],
      properties: {
        type: { type: "string", format: "uri" },
        title: { type: "string" },
        status: { type: "integer" },
        code: { type: "string" },
        detail: { type: "string" },
        fields: { type: "object", additionalProperties: { type: "string" } },
      },
    },
    ProjectSummary: {
      type: "object",
      required: ["id", "name", "createdAt", "updatedAt", "thumbnailUrl", "currentVersion"],
      additionalProperties: false,
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        createdAt: isoDate,
        updatedAt: isoDate,
        thumbnailUrl: { type: ["string", "null"] },
        currentVersion: {
          oneOf: [
            {
              type: "object",
              required: ["number"],
              additionalProperties: false,
              properties: { number: { type: "integer", minimum: 1 } },
            },
            { type: "null" },
          ],
        },
      },
    },
    ProjectDetail: {
      type: "object",
      required: [
        "id",
        "name",
        "descriptionText",
        "parameters",
        "site",
        "createdAt",
        "updatedAt",
        "thumbnailUrl",
        "currentVersion",
        "lastJob",
      ],
      additionalProperties: false,
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        descriptionText: { type: ["string", "null"] },
        parameters: { type: ["object", "null"] },
        site: { type: ["object", "null"] },
        createdAt: isoDate,
        updatedAt: isoDate,
        thumbnailUrl: { type: ["string", "null"] },
        currentVersion: {
          oneOf: [
            {
              type: "object",
              required: ["id", "number", "origin", "createdAt"],
              additionalProperties: false,
              properties: {
                id: { type: "string", format: "uuid" },
                number: { type: "integer", minimum: 1 },
                origin: { type: "string", enum: ["generated", "edited", "restored"] },
                createdAt: isoDate,
              },
            },
            { type: "null" },
          ],
        },
        lastJob: { type: "null", description: "Reserved until generation jobs exist." },
      },
    },
  },
  responses: {
    Unauthenticated: problemResponse("UNAUTHENTICATED: no valid session"),
    CsrfInvalid: problemResponse("CSRF_TOKEN_INVALID: missing or mismatching X-CSRF-Token"),
    RateLimited: problemResponse("RATE_LIMITED"),
    ValidationError: problemResponse("VALIDATION_ERROR, with one entry per field in `fields`"),
    ProjectNotFound: problemResponse(
      "PROJECT_NOT_FOUND: unknown, deleted, owned by another user or malformed id (identical body)",
    ),
  },
};

const projectPaths = {
  "/projects": {
    get: {
      summary: "List the user's projects, most recently modified first",
      parameters: [
        {
          name: "limit",
          in: "query",
          schema: {
            type: "integer",
            minimum: 1,
            maximum: PROJECT_LIST_MAX_LIMIT,
            default: PROJECT_LIST_DEFAULT_LIMIT,
          },
        },
        {
          name: "cursor",
          in: "query",
          description: "Opaque value taken from nextCursor.",
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: "One page",
          content: json({
            type: "object",
            required: ["items", "nextCursor"],
            additionalProperties: false,
            properties: {
              items: { type: "array", items: { $ref: "#/components/schemas/ProjectSummary" } },
              nextCursor: { type: ["string", "null"] },
            },
          }),
        },
        ...validation,
        ...common,
      },
    },
    post: {
      summary: "Create an empty project",
      parameters: [csrfHeader],
      requestBody: {
        required: true,
        content: json({
          type: "object",
          required: ["name"],
          additionalProperties: false,
          properties: { name: projectName },
        }),
      },
      responses: { "201": projectCreated, ...validation, ...mutation },
    },
  },
  "/projects/{id}": {
    get: {
      summary: "Read a project",
      parameters: [idParameter],
      responses: {
        "200": { description: "Project", content: json(projectEnvelope) },
        ...notFound,
        ...common,
      },
    },
    patch: {
      summary: "Rename a project or change its description",
      parameters: [idParameter, csrfHeader],
      requestBody: {
        required: true,
        content: json({
          type: "object",
          minProperties: 1,
          additionalProperties: false,
          properties: {
            name: projectName,
            descriptionText: {
              type: ["string", "null"],
              maxLength: PROJECT_DESCRIPTION_MAX_LENGTH,
            },
          },
        }),
      },
      responses: {
        "200": { description: "Updated project", content: json(projectEnvelope) },
        ...notFound,
        ...validation,
        ...mutation,
      },
    },
    delete: {
      summary: "Move a project to the bin (kept 30 days, then purged)",
      parameters: [idParameter, csrfHeader],
      responses: { "204": { description: "Deleted" }, ...notFound, ...mutation },
    },
  },
  "/projects/{id}/duplicate": {
    post: {
      summary: "Copy a project with its current version",
      parameters: [idParameter, csrfHeader],
      responses: { "201": projectCreated, ...notFound, ...validation, ...mutation },
    },
  },
};

/**
 * Hand-written document; generation from the Zod schemas is not planned yet.
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
      ...projectPaths,
    },
    components,
  }));
  done();
};
