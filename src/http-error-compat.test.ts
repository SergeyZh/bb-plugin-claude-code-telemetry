import { describe, expect, it } from "vitest";
import { experimental_BbHttpError } from "./http-error-compat.js";

describe("standalone HTTP error compatibility", () => {
  it("recognizes host errors by the exact upstream brand across SDK copies", () => {
    const hostError = Object.assign(new Error("Host not found"), {
      status: 404,
      code: "host_not_found",
      body: { error: "missing" },
    });
    Object.defineProperty(hostError, Symbol.for("@bb/sdk/http-error"), {
      value: true,
    });
    expect(hostError).toBeInstanceOf(experimental_BbHttpError);
    expect(Object.assign(new Error("Unrelated"), { status: 404 })).not.toBeInstanceOf(
      experimental_BbHttpError,
    );
    for (const value of [null, undefined, 404, "error", {}, { status: 404 }]) {
      expect(value instanceof experimental_BbHttpError).toBe(false);
    }
  });

  it("constructs the upstream error message and response metadata", () => {
    const error = new experimental_BbHttpError({
      status: 503,
      code: "unavailable",
      message: "Try later",
      body: { retry: true },
    });
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(experimental_BbHttpError);
    expect(error).toMatchObject({
      name: "BbHttpError",
      message: "HTTP 503: Try later",
      status: 503,
      code: "unavailable",
      body: { retry: true },
    });
  });
});
