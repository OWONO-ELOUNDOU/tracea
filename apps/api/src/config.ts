import { z } from "zod";

const FORBIDDEN_TRUST_PROXY = new Set(["true", "*", "0.0.0.0/0", "::/0"]);

/**
 * Trusted reverse proxies, in proxy-addr syntax (addresses, CIDR ranges, `loopback`, `linklocal`,
 * `uniquelocal`). Empty means no proxy is trusted and the socket address is the client address.
 * Values that would trust any sender are refused, since the client controls `X-Forwarded-For`
 * and the rate limits are keyed on the resulting address. Numbers (hop counts) are refused too:
 * Fastify ignores them silently.
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
      if (FORBIDDEN_TRUST_PROXY.has(lower) || /\/0+$/.test(lower)) {
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
  TRUST_PROXY: TrustProxySchema,
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
