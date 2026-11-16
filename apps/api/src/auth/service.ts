import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { auditLog, emailTokens, sessions, users, type User } from "../db/schema.js";
import { errors } from "../errors.js";
import type { Mailer } from "../mail/mailer.js";
import { passwordResetMail, verificationMail } from "../mail/templates.js";
import { assessPassword, DUMMY_HASH_PROMISE, hashPassword, verifyPassword } from "./password.js";
import { generateToken, hashToken } from "./tokens.js";

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export interface AuthServiceOptions {
  db: Database;
  mailer: Mailer;
  appUrl: string;
  sessionTtlHours: number;
}

export interface SessionContext {
  ip?: string | undefined;
  userAgent?: string | undefined;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string | null;
  plan: User["plan"];
  emailVerified: boolean;
  createdAt: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    plan: user.plan,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt.toISOString(),
  };
}

export class AuthService {
  private readonly db: Database;
  private readonly mailer: Mailer;
  private readonly appUrl: string;
  private readonly sessionTtlMs: number;

  constructor(options: AuthServiceOptions) {
    this.db = options.db;
    this.mailer = options.mailer;
    this.appUrl = options.appUrl.replace(/\/$/, "");
    this.sessionTtlMs = options.sessionTtlHours * 60 * 60 * 1000;
  }

  private async findUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(sql`lower(${users.email}) = ${email.toLowerCase()}`, isNull(users.deletedAt)))
      .limit(1);
    return user;
  }

  private async audit(
    actorId: string | null,
    action: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.db.insert(auditLog).values({ actorId, action, metadata: metadata ?? null });
  }

  private async issueEmailToken(
    userId: string,
    purpose: "verify_email" | "reset_password",
    ttlMs: number,
  ): Promise<string> {
    const token = generateToken();
    await this.db.insert(emailTokens).values({
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return token;
  }

  private async sendVerification(user: User): Promise<void> {
    const token = await this.issueEmailToken(user.id, "verify_email", VERIFY_TOKEN_TTL_MS);
    const link = `${this.appUrl}/verification?token=${encodeURIComponent(token)}`;
    await this.mailer.send(verificationMail(user.email, link));
  }

  /**
   * Creates the account and sends the verification mail. When the address is already taken
   * the call still succeeds, so the response never reveals whether an account exists.
   */
  async register(email: string, password: string): Promise<void> {
    const strength = assessPassword(password);
    if (strength !== "ok") throw errors.passwordTooWeak(strength);

    const existing = await this.findUserByEmail(email);
    if (existing !== undefined) {
      if (existing.emailVerifiedAt === null) await this.sendVerification(existing);
      return;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await this.db.insert(users).values({ email, passwordHash }).returning();
    if (user === undefined) throw new Error("user insert returned no row");
    await this.audit(user.id, "auth.register");
    await this.sendVerification(user);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.findUserByEmail(email);
    if (user?.emailVerifiedAt === null) await this.sendVerification(user);
  }

  async verifyEmail(token: string): Promise<void> {
    const now = new Date();
    const [row] = await this.db
      .select()
      .from(emailTokens)
      .where(
        and(
          eq(emailTokens.tokenHash, hashToken(token)),
          eq(emailTokens.purpose, "verify_email"),
          isNull(emailTokens.usedAt),
          gt(emailTokens.expiresAt, now),
        ),
      )
      .limit(1);
    if (row === undefined) throw errors.tokenInvalid();

    await this.db.update(emailTokens).set({ usedAt: now }).where(eq(emailTokens.id, row.id));
    await this.db
      .update(users)
      .set({ emailVerifiedAt: now, updatedAt: now })
      .where(and(eq(users.id, row.userId), isNull(users.emailVerifiedAt)));
    await this.audit(row.userId, "auth.verify_email");
  }

  /** Returns the user and a fresh session id; the caller sets the cookie. */
  async login(
    email: string,
    password: string,
    context: SessionContext,
  ): Promise<{ user: User; sessionId: string; expiresAt: Date }> {
    const user = await this.findUserByEmail(email);
    const storedHash = user?.passwordHash ?? (await DUMMY_HASH_PROMISE);
    const valid = await verifyPassword(storedHash, password);
    if (user === undefined || !valid) {
      await this.audit(user?.id ?? null, "auth.login_failed");
      throw errors.invalidCredentials();
    }
    if (user.emailVerifiedAt === null) throw errors.emailNotVerified();

    const { sessionId, expiresAt } = await this.createSession(user.id, context);
    await this.audit(user.id, "auth.login");
    return { user, sessionId, expiresAt };
  }

  async createSession(
    userId: string,
    context: SessionContext,
  ): Promise<{ sessionId: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);
    const [session] = await this.db
      .insert(sessions)
      .values({ userId, expiresAt, ip: context.ip ?? null, userAgent: context.userAgent ?? null })
      .returning();
    if (session === undefined) throw new Error("session insert returned no row");
    return { sessionId: session.id, expiresAt };
  }

  async resolveSession(sessionId: string): Promise<User | undefined> {
    const [row] = await this.db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.id, sessionId),
          gt(sessions.expiresAt, new Date()),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    return row?.user;
  }

  async logout(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async logoutAll(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
    await this.audit(userId, "auth.logout_all");
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.findUserByEmail(email);
    if (user === undefined) return;
    const token = await this.issueEmailToken(user.id, "reset_password", RESET_TOKEN_TTL_MS);
    const link = `${this.appUrl}/reinitialisation?token=${encodeURIComponent(token)}`;
    await this.mailer.send(passwordResetMail(user.email, link));
    await this.audit(user.id, "auth.password_reset_requested");
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const strength = assessPassword(password);
    if (strength !== "ok") throw errors.passwordTooWeak(strength);

    const now = new Date();
    const [row] = await this.db
      .select()
      .from(emailTokens)
      .where(
        and(
          eq(emailTokens.tokenHash, hashToken(token)),
          eq(emailTokens.purpose, "reset_password"),
          isNull(emailTokens.usedAt),
          gt(emailTokens.expiresAt, now),
        ),
      )
      .limit(1);
    if (row === undefined) throw errors.tokenInvalid();

    const passwordHash = await hashPassword(password);
    await this.db.update(emailTokens).set({ usedAt: now }).where(eq(emailTokens.id, row.id));
    await this.db
      .update(users)
      .set({
        passwordHash,
        updatedAt: now,
        emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, ${now})`,
      })
      .where(eq(users.id, row.userId));
    await this.db.delete(sessions).where(eq(sessions.userId, row.userId));
    await this.audit(row.userId, "auth.password_reset");
  }

  async updateProfile(userId: string, patch: { displayName?: string | null }): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (user === undefined) throw new Error("user update returned no row");
    return user;
  }
}
