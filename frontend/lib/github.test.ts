import { afterEach, describe, expect, it, vi } from "vitest";
import { githubUsernameSchema, RateLimitError, searchUsers } from "./github";

describe("githubUsernameSchema", () => {
  it("accepts valid usernames", () => {
    expect(() => githubUsernameSchema.parse("octocat")).not.toThrow();
    expect(() => githubUsernameSchema.parse("a-b")).not.toThrow();
    expect(() => githubUsernameSchema.parse("a".repeat(39))).not.toThrow();
  });

  it("accepts single-character username", () => {
    expect(() => githubUsernameSchema.parse("a")).not.toThrow();
    expect(() => githubUsernameSchema.parse("Z")).not.toThrow();
    expect(() => githubUsernameSchema.parse("5")).not.toThrow();
  });

  it("accepts numeric-only usernames", () => {
    expect(() => githubUsernameSchema.parse("123")).not.toThrow();
    expect(() => githubUsernameSchema.parse("0")).not.toThrow();
    expect(() => githubUsernameSchema.parse("999999")).not.toThrow();
  });

  it("accepts mixed alphanumeric usernames", () => {
    expect(() => githubUsernameSchema.parse("user123")).not.toThrow();
    expect(() => githubUsernameSchema.parse("123user")).not.toThrow();
    expect(() => githubUsernameSchema.parse("a1b2c3")).not.toThrow();
  });

  it("accepts uppercase letters in usernames", () => {
    expect(() => githubUsernameSchema.parse("UserName")).not.toThrow();
    expect(() => githubUsernameSchema.parse("ALLCAPS")).not.toThrow();
    expect(() => githubUsernameSchema.parse("MixedCase123")).not.toThrow();
  });

  it("rejects invalid usernames", () => {
    expect(() => githubUsernameSchema.parse("-bad")).toThrow();
    expect(() => githubUsernameSchema.parse("bad-")).toThrow();
    expect(() => githubUsernameSchema.parse("bad--name")).toThrow();
    expect(() => githubUsernameSchema.parse("")).toThrow();
    expect(() => githubUsernameSchema.parse("a".repeat(40))).toThrow();
  });

  it("rejects usernames with disallowed special characters", () => {
    expect(() => githubUsernameSchema.parse("user_name")).toThrow();
    expect(() => githubUsernameSchema.parse("user.name")).toThrow();
    expect(() => githubUsernameSchema.parse("user name")).toThrow();
    expect(() => githubUsernameSchema.parse("user@name")).toThrow();
    expect(() => githubUsernameSchema.parse("user!name")).toThrow();
  });
});

describe("GitHub API rate limiting", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("throws RateLimitError when GitHub responds 403 with remaining=0", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    const resetSeconds = Math.floor(Date.now() / 1000) + 120;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ message: "rate limit" }), {
          status: 403,
          statusText: "Forbidden",
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": String(resetSeconds),
          },
        });
      })
    );

    let error: unknown;
    try {
      await searchUsers("oct");
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).resetTime.getTime()).toBe(resetSeconds * 1000);
  });

  it("throws RateLimitError when GitHub responds 429 with retry-after", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ message: "too many requests" }), {
          status: 429,
          statusText: "Too Many Requests",
          headers: {
            "retry-after": "30",
          },
        });
      })
    );

    let error: unknown;
    try {
      await searchUsers("oct");
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).resetTime.getTime()).toBe(Date.now() + 30_000);
  });
});
