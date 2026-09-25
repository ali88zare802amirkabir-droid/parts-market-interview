import { describe, it, expect, beforeAll } from "vitest";
import { signSessionToken, verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

const SECRET = "test-secret-for-unit-tests-0123456789";

describe("authentication", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
  });

  it("signs and verifies a session token", async () => {
    const token = await signSessionToken("admin");
    const session = await verifySessionToken(token);
    expect(session).not.toBeNull();
    expect(session?.sub).toBe("admin");
    expect(session?.role).toBe("admin");
    expect(session?.exp).toBeGreaterThan(0);
  });

  it("rejects a tampered token", async () => {
    const token = await signSessionToken("admin");
    const tampered = token.slice(0, -2) + "xx";
    const session = await verifySessionToken(tampered);
    expect(session).toBeNull();
  });

  it("rejects empty / undefined tokens", async () => {
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
    expect(await verifySessionToken(null)).toBeNull();
  });

  it("rejects tokens signed with a different secret", async () => {
    const old = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "a-completely-different-secret";
    const token = await signSessionToken("admin");
    process.env.JWT_SECRET = SECRET;
    const session = await verifySessionToken(token);
    expect(session).toBeNull();
    process.env.JWT_SECRET = old;
  });

  it("hashes and verifies passwords without storing plaintext", () => {
    const hash = hashPassword("Interview2026!");
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toContain("Interview2026!");
    expect(verifyPassword("Interview2026!", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("gets the right cookie name", () => {
    expect(SESSION_COOKIE).toBe("parts_admin_session");
  });
});