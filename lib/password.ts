import bcrypt from "bcryptjs";

/**
 * Password hashing helpers. bcrypt is intentionally isolated in this module so
 * the edge middleware never bundles it.
 */

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

export const DEFAULT_PASSWORD = "Interview2026!";
export const DEFAULT_USERNAME = "admin";