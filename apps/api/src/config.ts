import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  APP_URL: z.url().default("http://localhost:3000"),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
  DATABASE_URL: z.string().min(1).default("postgres://tracea:tracea@localhost:5432/tracea"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(72),
  SMTP_URL: z.string().min(1).default("smtp://localhost:1025"),
  MAIL_FROM: z.string().min(1).default("Tracea <no-reply@tracea.app>"),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return result.data;
}
