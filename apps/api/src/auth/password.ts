import { hash, verify } from "@node-rs/argon2";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

// Argon2id parameters from the architecture dossier (§ 7): m = 64 MiB, t = 3, p = 1.
// `algorithm: 2` is Argon2id in @node-rs/argon2 (its enum is a const enum, unusable with isolatedModules).
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
};

/** Most frequent passwords of at least 12 characters; the full compromised-password check is a later task. */
const COMMON_PASSWORDS = new Set([
  "123456789012",
  "password1234",
  "qwertyuiop12",
  "motdepasse12",
  "azertyuiop12",
  "administrator",
  "iloveyou1234",
]);

export type PasswordStrength = "too_short" | "too_common" | "ok";

export function assessPassword(password: string): PasswordStrength {
  if (password.length < PASSWORD_MIN_LENGTH) return "too_short";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "too_common";
  return "ok";
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  return verify(storedHash, password);
}

/**
 * Hash of a fixed string, verified against when the e-mail is unknown so that login takes the
 * same time whether or not the account exists.
 */
export const DUMMY_HASH_PROMISE = hashPassword("tracea-dummy-password-for-timing");
