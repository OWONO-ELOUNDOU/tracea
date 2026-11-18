import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import { requireUser } from "../auth/plugin.js";
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_LIST_DEFAULT_LIMIT,
  PROJECT_LIST_MAX_LIMIT,
  PROJECT_NAME_MAX_LENGTH,
  type ProjectService,
} from "../projects/service.js";
import { parseBody } from "../validation.js";

const INVALID_BODY = "Corps de requête invalide.";
const LIMIT_MESSAGE = `La limite doit être comprise entre 1 et ${String(PROJECT_LIST_MAX_LIMIT)}.`;

const name = z
  .string("Le nom est requis.")
  .trim()
  .min(1, "Le nom est requis.")
  .max(
    PROJECT_NAME_MAX_LENGTH,
    `Le nom est limité à ${String(PROJECT_NAME_MAX_LENGTH)} caractères.`,
  )
  .refine((value) => !/\p{Cc}/u.test(value), "Le nom contient des caractères non autorisés.");

const descriptionText = z
  .string("La description doit être un texte.")
  .max(
    PROJECT_DESCRIPTION_MAX_LENGTH,
    `La description est limitée à ${String(PROJECT_DESCRIPTION_MAX_LENGTH)} caractères.`,
  )
  // PostgreSQL text columns cannot store the NUL character.
  .refine(
    (value) => !value.includes("\u0000"),
    "La description contient un caractère non autorisé.",
  )
  .nullable();

const CreateSchema = z.strictObject({ name }, INVALID_BODY);
const PatchSchema = z
  .strictObject(
    { name: name.optional(), descriptionText: descriptionText.optional() },
    INVALID_BODY,
  )
  .refine(
    (body) => body.name !== undefined || body.descriptionText !== undefined,
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
    return reply.status(201).header("Location", `/projects/${project.id}`).send({ project });
  });

  app.get<IdParams>("/projects/:id", async (request) => {
    const user = requireUser(request);
    return { project: await projects.get(user.id, request.params.id) };
  });

  app.patch<IdParams>("/projects/:id", async (request) => {
    const user = requireUser(request);
    const body = parseBody(PatchSchema, request.body);
    return { project: await projects.update(user.id, request.params.id, body) };
  });

  app.post<IdParams>("/projects/:id/duplicate", async (request, reply) => {
    const user = requireUser(request);
    parseBody(EmptyBodySchema, request.body);
    const project = await projects.duplicate(user.id, request.params.id);
    return reply.status(201).header("Location", `/projects/${project.id}`).send({ project });
  });

  app.delete<IdParams>("/projects/:id", async (request, reply) => {
    const user = requireUser(request);
    await projects.delete(user.id, request.params.id);
    return reply.status(204).send();
  });

  done();
};
