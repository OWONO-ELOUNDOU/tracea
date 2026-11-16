import type { FastifyPluginCallback } from "fastify";
import { SCHEMA_VERSION } from "@tracea/domain";

export const healthRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get("/health", () => ({
    status: "ok",
    service: "tracea-api",
    modelSchemaVersion: SCHEMA_VERSION,
    time: new Date().toISOString(),
  }));
  done();
};
