import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppConfig } from "./config.js";
import { problem, problemErrorHandler } from "./problem.js";
import { healthRoutes } from "./routes/health.js";
import { openapiRoutes } from "./routes/openapi.js";

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    requestIdHeader: "x-request-id",
    trustProxy: true,
    bodyLimit: 1_048_576,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: config.NODE_ENV === "production",
  });
  await app.register(cors, {
    origin: config.APP_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  });
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_PER_MINUTE,
    timeWindow: "1 minute",
  });

  app.setErrorHandler(problemErrorHandler);
  app.setNotFoundHandler((_request, reply) => {
    void reply
      .status(404)
      .type("application/problem+json")
      .send(problem(404, "NOT_FOUND", "Ressource introuvable"));
  });

  await app.register(healthRoutes);
  await app.register(openapiRoutes);

  return app;
}
