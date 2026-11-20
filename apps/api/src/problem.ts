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

interface FrameworkProblem {
  code: string;
  title: string;
  detail: string;
}

const INVALID_BODY_TITLE = "Corps de requête invalide";

/**
 * French wording for the 4xx errors raised by the framework or its plugins, keyed by their
 * internal code. Their own name and message are never sent: they name the framework and could,
 * for a future plugin, carry request content (S2-SEC-05).
 */
const FRAMEWORK_ERRORS_BY_CODE: Readonly<Record<string, FrameworkProblem>> = {
  FST_ERR_CTP_INVALID_JSON_BODY: {
    code: "INVALID_BODY",
    title: INVALID_BODY_TITLE,
    detail: "Le corps de la requête n'est pas un document JSON valide.",
  },
  FST_ERR_CTP_EMPTY_JSON_BODY: {
    code: "INVALID_BODY",
    title: INVALID_BODY_TITLE,
    detail: "Le corps de la requête est vide alors qu'un document JSON est attendu.",
  },
  FST_ERR_CTP_INVALID_CONTENT_LENGTH: {
    code: "INVALID_BODY",
    title: INVALID_BODY_TITLE,
    detail: "La longueur annoncée du corps ne correspond pas à son contenu.",
  },
};

const FRAMEWORK_ERRORS_BY_STATUS: Readonly<Record<number, FrameworkProblem>> = {
  413: {
    code: "PAYLOAD_TOO_LARGE",
    title: "Corps de requête trop volumineux",
    detail: "Le corps de la requête dépasse la taille autorisée.",
  },
  415: {
    code: "UNSUPPORTED_MEDIA_TYPE",
    title: "Type de contenu non pris en charge",
    detail: "Envoyez le corps au format JSON (Content-Type: application/json).",
  },
};

const DEFAULT_REQUEST_ERROR: FrameworkProblem = {
  code: "REQUEST_ERROR",
  title: "Requête invalide",
  detail: "La requête ne peut pas être traitée.",
};

/** Problem Details for a 4xx error that is not an ApiError. */
export function frameworkProblem(
  status: number,
  frameworkCode: string | undefined,
): ProblemDetails {
  const known =
    (frameworkCode === undefined ? undefined : FRAMEWORK_ERRORS_BY_CODE[frameworkCode]) ??
    FRAMEWORK_ERRORS_BY_STATUS[status] ??
    DEFAULT_REQUEST_ERROR;
  return problem(status, known.code, known.title, known.detail);
}

/**
 * Error handler of the application, also used for `frameworkErrors` (malformed URL), which
 * Fastify otherwise answers outside of the error handler.
 */
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
  if (status < 400 || status >= 500) {
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
  // The original code only, never the message: it may quote the URL or the body.
  const originalCode = typeof error.code === "string" && error.code !== "" ? error.code : undefined;
  request.log.info(
    { requestId: request.id, statusCode: status, errorCode: originalCode ?? "unknown" },
    "request rejected by the framework",
  );
  sendProblem(reply, frameworkProblem(status, originalCode));
}
