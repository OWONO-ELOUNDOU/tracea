import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ApiError } from "./errors.js";

/** Error payload shared by every route (RFC 9457). Messages shown to users are in French. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  fields?: Record<string, string>;
}

const BASE_TYPE = "https://tracea.app/errors/";

export function problem(
  status: number,
  code: string,
  title: string,
  detail?: string,
  fields?: Record<string, string>,
): ProblemDetails {
  const slug = code.toLowerCase().replaceAll("_", "-");
  return {
    type: `${BASE_TYPE}${slug}`,
    title,
    status,
    code,
    ...(detail === undefined ? {} : { detail }),
    ...(fields === undefined ? {} : { fields }),
  };
}

export function sendProblem(reply: FastifyReply, details: ProblemDetails): void {
  void reply.status(details.status).type("application/problem+json").send(details);
}

export function problemErrorHandler(
  error: FastifyError | ApiError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof ApiError) {
    sendProblem(reply, problem(error.status, error.code, error.title, error.detail, error.fields));
    return;
  }
  const status = error.statusCode ?? 500;
  if (status >= 500) {
    request.log.error({ err: error, requestId: request.id }, "unhandled error");
    sendProblem(
      reply,
      problem(500, "INTERNAL_ERROR", "Erreur interne", "Une erreur inattendue s'est produite."),
    );
    return;
  }
  if (status === 429) {
    sendProblem(
      reply,
      problem(429, "RATE_LIMITED", "Trop de tentatives", "Réessayez dans quelques minutes."),
    );
    return;
  }
  sendProblem(reply, problem(status, error.code || "REQUEST_ERROR", error.name, error.message));
}
