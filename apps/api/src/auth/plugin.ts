import fastifyCookie from "@fastify/cookie";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomBytes } from "node:crypto";
import type { User } from "../db/schema.js";
import { errors } from "../errors.js";
import type { AuthService } from "./service.js";

export const SESSION_COOKIE = "tracea_session";
export const CSRF_COOKIE = "tracea_csrf";
export const CSRF_HEADER = "x-csrf-token";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
    sessionId: string | null;
  }
}

export interface SessionPluginOptions {
  auth: AuthService;
  secret: string;
  secureCookies: boolean;
}

function cookieBase(secure: boolean) {
  return { path: "/", sameSite: "lax" as const, secure };
}

export function setSessionCookie(
  reply: FastifyReply,
  sessionId: string,
  expiresAt: Date,
  secure: boolean,
): void {
  void reply.setCookie(SESSION_COOKIE, sessionId, {
    ...cookieBase(secure),
    httpOnly: true,
    signed: true,
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply: FastifyReply, secure: boolean): void {
  void reply.clearCookie(SESSION_COOKIE, { ...cookieBase(secure), httpOnly: true });
}

/** Double-submit token: readable cookie, echoed back in a header on every mutation. */
export function issueCsrfToken(reply: FastifyReply, secure: boolean): string {
  const token = randomBytes(32).toString("base64url");
  void reply.setCookie(CSRF_COOKIE, token, { ...cookieBase(secure), httpOnly: false });
  return token;
}

export async function registerSessionPlugin(
  app: FastifyInstance,
  options: SessionPluginOptions,
): Promise<void> {
  await app.register(fastifyCookie, { secret: options.secret });

  app.decorateRequest("user", null);
  app.decorateRequest("sessionId", null);

  app.addHook("onRequest", async (request: FastifyRequest) => {
    const raw = request.cookies[SESSION_COOKIE];
    if (raw === undefined) return;
    const unsigned = request.unsignCookie(raw);
    if (!unsigned.valid) return;
    const user = await options.auth.resolveSession(unsigned.value);
    if (user !== undefined) {
      request.user = user;
      request.sessionId = unsigned.value;
    }
  });

  app.addHook("onRequest", (request: FastifyRequest, _reply, next) => {
    if (!MUTATING_METHODS.has(request.method)) {
      next();
      return;
    }
    const cookie = request.cookies[CSRF_COOKIE];
    const header = request.headers[CSRF_HEADER];
    if (
      cookie === undefined ||
      typeof header !== "string" ||
      header.length === 0 ||
      header !== cookie
    ) {
      next(errors.csrf());
      return;
    }
    next();
  });
}

export function requireUser(request: FastifyRequest): User {
  if (request.user === null) throw errors.unauthenticated();
  return request.user;
}
