import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { connectDatabase } from "./db/client.js";
import { SmtpMailer } from "./mail/smtp.js";

const config = loadConfig();
const database = await connectDatabase(config.DATABASE_URL);
const mailer = new SmtpMailer(config.SMTP_URL, config.MAIL_FROM);
const app = await buildApp(config, { db: database.db, mailer });

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await database.close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ port: config.API_PORT, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
