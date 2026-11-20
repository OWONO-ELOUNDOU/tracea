import {
  DescriptionTextSchema,
  ProjectNameSchema,
  ProjectParametersSchema,
  ProjectSiteSchema,
} from "@tracea/domain";
import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/plugin.js";
import {
  PROJECT_LIST_DEFAULT_LIMIT,
  PROJECT_LIST_MAX_LIMIT,
  projectEtag,
  type ProjectService,
} from "../projects/service.js";
import { parseBody } from "../validation.js";

const INVALID_BODY = "Corps de requête invalide.";
const LIMIT_MESSAGE = `La limite doit être comprise entre 1 et ${String(PROJECT_LIST_MAX_LIMIT)}.`;

const CreateSchema = z.strictObject({ name: ProjectNameSchema }, INVALID_BODY);
// Each group replaces the stored value entirely; `null` clears parameters, site or description.
const PatchSchema = z
  .strictObject(
    {
      name: ProjectNameSchema.optional(),
      descriptionText: DescriptionTextSchema.optional(),
      parameters: ProjectParametersSchema.nullable().optional(),
      site: ProjectSiteSchema.nullable().optional(),
    },
    INVALID_BODY,
  )
  .refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    "Indiquez au moins un champ à modifier.",
  );
const EmptyBodySchema = z.strictObject({}, INVALID_BODY).nullish();
const ListQuerySchema = z.object({
  limit: z.coerce
    .number(LIMIT_MESSAGE)
    .int(LIMIT_MESSAGE)
    .min(1, LIMIT_MESSAGE)
    .max(PROJECT_LIST_MAX_LIMIT, LIMIT_MESSAGE)
    .default(PROJECT_LIST_DEFAULT_LIMIT),
  cursor: z
    .string("Curseur invalide.")
    .min(1, "Curseur invalide.")
    .max(512, "Curseur invalide.")
    .optional(),
});

export interface ProjectRoutesOptions {
  projects: ProjectService;
}

interface IdParams {
  Params: { id: string };
}

export const projectRoutes: FastifyPluginCallback<ProjectRoutesOptions> = (app, options, done) => {
  const { projects } = options;

  app.get("/projects", async (request) => {
    const user = requireUser(request);
    const query = parseBody(ListQuerySchema, request.query);
    return projects.list(user.id, query);
  });

  app.post("/projects", async (request, reply) => {
    const user = requireUser(request);
    const body = parseBody(CreateSchema, request.body);
    const project = await projects.create(user.id, body.name);
    return reply
      .status(201)
      .header("Location", `/projects/${project.id}`)
      .header("ETag", projectEtag(project.updatedAt))
      .send({ project });
  });

  app.get<IdParams>("/projects/:id", async (request, reply) => {
    const user = requireUser(request);
    const project = await projects.get(user.id, request.params.id);
    return reply.header("ETag", projectEtag(project.updatedAt)).send({ project });
  });

  // Order of checks: session (401), CSRF (403, hook), body (400/415 framework, 422), owner (404),
  // If-Match (412).
  app.patch<IdParams>("/projects/:id", async (request, reply) => {
    const user = requireUser(request);
    const body = parseBody(PatchSchema, request.body);
    const project = await projects.update(user.id, request.params.id, body, {
      ifMatch: request.headers["if-match"],
    });
    return reply.header("ETag", projectEtag(project.updatedAt)).send({ project });
  });

  app.post<IdParams>("/projects/:id/duplicate", async (request, reply) => {
    const user = requireUser(request);
    parseBody(EmptyBodySchema, request.body);
    const project = await projects.duplicate(user.id, request.params.id);
    return reply
      .status(201)
      .header("Location", `/projects/${project.id}`)
      .header("ETag", projectEtag(project.updatedAt))
      .send({ project });
  });

  app.delete<IdParams>("/projects/:id", async (request, reply) => {
    const user = requireUser(request);
    await projects.delete(user.id, request.params.id);
    return reply.status(204).send();
  });

  done();
};
