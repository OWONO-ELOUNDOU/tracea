import { z } from "zod";

const FORBIDDEN_TRUST_PROXY = new Set(["true", "*", "0.0.0.0/0", "::/0"]);
/** Ways of writing "no proxy" that proxy-addr would later reject as an invalid address (A10). */
const DISABLED_TRUST_PROXY = new Set(["false", "no", "off", "none"]);

/**
 * Trusted reverse proxies, in proxy-addr syntax (addresses, CIDR ranges, `loopback`, `linklocal`,
 * `uniquelocal`). Empty means no proxy is trusted and the socket address is the client address.
 * Values that would trust any sender are refused, since the client controls `X-Forwarded-For`
 * and the rate limits are keyed on the resulting address. Numbers (hop counts) are refused too:
 * Fastify ignores them silently. "false" and the like are refused with a hint, since the empty
 * value is the way to trust no proxy.
 */
const TrustProxySchema = z
  .string()
  .optional()
  .transform((value, context) => {
    const entries = (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    if (entries.length === 0) return undefined;
    for (const entry of entries) {
      const lower = entry.toLowerCase();
      if (DISABLED_TRUST_PROXY.has(lower)) {
        context.addIssue({
          code: "custom",
          message: `"${entry}" is not a proxy address; to trust no proxy, leave TRUST_PROXY empty (TRUST_PROXY=)`,
        });
      } else if (FORBIDDEN_TRUST_PROXY.has(lower) || /\/0+$/.test(lower)) {
        context.addIssue({
          code: "custom",
          message: `"${entry}" would trust every sender; list the addresses or CIDR ranges of the proxies in front of the API`,
        });
      } else if (/^\d+$/.test(entry)) {
        context.addIssue({
          code: "custom",
          message: `"${entry}" is a hop count, which Fastify ignores; list the addresses or CIDR ranges of the proxies instead`,
        });
      }
    }
    return entries.join(",");
  });

const LogLevelSchema = z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: LogLevelSchema,
  APP_URL: z.url().default("http://localhost:3000"),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
  DATABASE_URL: z.string().min(1).default("postgres://tracea:tracea@localhost:5432/tracea"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(72),
  SMTP_URL: z.string().min(1).default("smtp://localhost:1025"),
  MAIL_FROM: z.string().min(1).default("Tracea <no-reply@tracea.app>"),
  TRUST_PROXY: TrustProxySchema,
});

export type AppConfig = z.infer<typeof EnvSchema>;

/**
 * Configuration of the maintenance command (purge), reduced to what it uses (S2-SEC-08): the
 * scheduled job holds no session secret nor mail credentials. No default database: a job that
 * would silently purge a local database instead of the intended one is worse than one that fails.
 */
const MaintenanceEnvSchema = z.object({
  LOG_LEVEL: LogLevelSchema,
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .trim()
    .min(1, "DATABASE_URL is required"),
});

export type MaintenanceConfig = z.infer<typeof MaintenanceEnvSchema>;
export type LogLevel = AppConfig["LOG_LEVEL"];

function parseEnv<T extends z.ZodType>(schema: T, env: NodeJS.ProcessEnv): z.infer<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return result.data;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return parseEnv(EnvSchema, env);
}

export function loadMaintenanceConfig(env: NodeJS.ProcessEnv = process.env): MaintenanceConfig {
  return parseEnv(MaintenanceEnvSchema, env);
}
