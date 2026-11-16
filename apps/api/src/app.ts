import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { registerSessionPlugin } from "./auth/plugin.js";
import { AuthService } from "./auth/service.js";
import type { AppConfig } from "./config.js";
import type { Database } from "./db/client.js";
import type { Mailer } from "./mail/mailer.js";
import { problem, problemErrorHandler, sendProblem } from "./problem.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { openapiRoutes } from "./routes/openapi.js";

export interface AppDependencies {
  db: Database;
  mailer: Mailer;
}

export async function buildApp(
  config: AppConfig,
  dependencies: AppDependencies,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    requestIdHeader: "x-request-id",
    trustProxy: true,
    bodyLimit: 1_048_576,
  });
  const secureCookies = config.NODE_ENV === "production";

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: secureCookies,
  });
  await app.register(cors, {
    origin: config.APP_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Request-Id"],
  });
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_PER_MINUTE,
    timeWindow: "1 minute",
  });

  app.setErrorHandler(problemErrorHandler);
  app.setNotFoundHandler((_request, reply) => {
    sendProblem(reply, problem(404, "NOT_FOUND", "Ressource introuvable"));
  });

  const auth = new AuthService({
    db: dependencies.db,
    mailer: dependencies.mailer,
    appUrl: config.APP_URL,
    sessionTtlHours: config.SESSION_TTL_HOURS,
  });
  await registerSessionPlugin(app, { auth, secret: config.SESSION_SECRET, secureCookies });

  await app.register(healthRoutes);
  await app.register(openapiRoutes);
  await app.register(authRoutes, {
    auth,
    secureCookies,
    strictRateLimits: config.NODE_ENV !== "test",
  });

  return app;
}
