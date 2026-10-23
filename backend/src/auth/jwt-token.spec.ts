import { describe, expect, it } from "vitest";
import { signJwt, verifyJwt } from "./jwt-token";

const user: Express.User = {
  id: "user-1", email: "user@example.com", fullName: "Test User", role: "STAFF",
  isTest: false, passwordChangeRequired: false,
};
const secret = "unit-test-secret";

describe("JWT authentication tokens", () => {
  it("signs and verifies an HS256 token with a seven-day expiry", () => {
    const now = 1_800_000_000_000;
    const token = signJwt(user, secret, now);
    expect(verifyJwt(token, secret, now)).toEqual(user);
    expect(() => verifyJwt(token, secret, now + 7 * 24 * 60 * 60 * 1000)).toThrow("Invalid or expired bearer token");
  });

  it.each(["bad.token", "x.e30.x", "", "eyJhbGciOiJub25lIn0.eyJpZCI6ImEiLCJleHAiOjk5OTk5OTk5OTl9."])("rejects malformed or tampered token %s", (token) => {
    expect(() => verifyJwt(token, secret)).toThrow("Invalid or expired bearer token");
  });

  it("rejects a missing signing secret", () => {
    expect(() => signJwt(user, "")).toThrow("JWT_SECRET must be configured");
    expect(() => verifyJwt("a.b.c", "")).toThrow("Invalid or expired bearer token");
  });
});
