import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

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

export function problemErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const status = error.statusCode ?? 500;
  if (status >= 500) {
    request.log.error({ err: error, requestId: request.id }, "unhandled error");
    void reply
      .status(500)
      .type("application/problem+json")
      .send(
        problem(500, "INTERNAL_ERROR", "Erreur interne", "Une erreur inattendue s'est produite."),
      );
    return;
  }
  const code = error.code || "REQUEST_ERROR";
  void reply
    .status(status)
    .type("application/problem+json")
    .send(problem(status, code, error.name, error.message));
}
