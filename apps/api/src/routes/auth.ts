import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import {
  clearSessionCookie,
  issueCsrfToken,
  requireUser,
  setSessionCookie,
} from "../auth/plugin.js";
import { PASSWORD_MAX_LENGTH } from "../auth/password.js";
import { toPublicUser, type AuthService } from "../auth/service.js";
import { parseBody } from "../validation.js";

const email = z
  .email("Adresse e-mail invalide")
  .max(254)
  .transform((value) => value.trim());
const password = z
  .string("Mot de passe requis")
  .min(1, "Mot de passe requis")
  .max(PASSWORD_MAX_LENGTH, `Mot de passe limité à ${String(PASSWORD_MAX_LENGTH)} caractères`);
const token = z.string().min(16).max(256);

const CredentialsSchema = z.object({ email, password });
const EmailSchema = z.object({ email });
const TokenSchema = z.object({ token });
const ResetSchema = z.object({ token, password });
const ProfilePatchSchema = z.object({
  displayName: z.string().trim().min(1).max(100).nullable().optional(),
});

export interface AuthRoutesOptions {
  auth: AuthService;
  secureCookies: boolean;
  /** Per-route limits on login and mail-sending routes; disabled by the test suite only. */
  strictRateLimits: boolean;
}

export const authRoutes: FastifyPluginCallback<AuthRoutesOptions> = (app, options, done) => {
  const { auth, secureCookies, strictRateLimits } = options;
  const limited = (max: number) =>
    strictRateLimits ? { config: { rateLimit: { max, timeWindow: "15 minutes" } } } : {};
  const loginRateLimit = limited(10);
  const mailRateLimit = limited(5);

  app.get("/auth/csrf", (_request, reply) => ({ token: issueCsrfToken(reply, secureCookies) }));

  app.post("/auth/register", mailRateLimit, async (request, reply) => {
    const body = parseBody(CredentialsSchema, request.body);
    await auth.register(body.email, body.password);
    return reply.status(201).send({ status: "verification_sent" });
  });

  app.post("/auth/resend-verification", mailRateLimit, async (request, reply) => {
    const body = parseBody(EmailSchema, request.body);
    await auth.resendVerification(body.email);
    return reply.status(202).send();
  });

  app.post("/auth/verify-email", async (request, reply) => {
    const body = parseBody(TokenSchema, request.body);
    await auth.verifyEmail(body.token);
    return reply.status(204).send();
  });

  app.post("/auth/login", loginRateLimit, async (request, reply) => {
    const body = parseBody(CredentialsSchema, request.body);
    const { user, sessionId, expiresAt } = await auth.login(body.email, body.password, {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });
    setSessionCookie(reply, sessionId, expiresAt, secureCookies);
    issueCsrfToken(reply, secureCookies);
    return { user: toPublicUser(user) };
  });

  app.post("/auth/logout", async (request, reply) => {
    if (request.sessionId !== null) await auth.logout(request.sessionId);
    clearSessionCookie(reply, secureCookies);
    return reply.status(204).send();
  });

  app.post("/auth/logout-all", async (request, reply) => {
    const user = requireUser(request);
    await auth.logoutAll(user.id);
    clearSessionCookie(reply, secureCookies);
    return reply.status(204).send();
  });

  app.post("/auth/password/forgot", mailRateLimit, async (request, reply) => {
    const body = parseBody(EmailSchema, request.body);
    await auth.requestPasswordReset(body.email);
    return reply.status(202).send();
  });

  app.post("/auth/password/reset", async (request, reply) => {
    const body = parseBody(ResetSchema, request.body);
    await auth.resetPassword(body.token, body.password);
    return reply.status(204).send();
  });

  app.get("/me", (request) => ({ user: toPublicUser(requireUser(request)) }));

  app.patch("/me", async (request) => {
    const user = requireUser(request);
    const body = parseBody(ProfilePatchSchema, request.body);
    const patch = body.displayName === undefined ? {} : { displayName: body.displayName };
    const updated = await auth.updateProfile(user.id, patch);
    return { user: toPublicUser(updated) };
  });

  done();
};
