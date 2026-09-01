import { describe, it, expect } from "vitest";
import { AppError, toErrorResponse, ok, statusFor } from "@/lib/errors";

describe("error envelope", () => {
  it("serializes AppError into the standard envelope", async () => {
    const err = new AppError("VALIDATION_ERROR", "Bad input", 400, { field: "url" });
    const res = toErrorResponse(err);
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: { code: string; message: string; details: unknown };
    };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toEqual({ field: "url" });
  });

  it("masks unknown errors as INTERNAL_ERROR with 500", async () => {
    const res = toErrorResponse(new Error("leaked secret detail"));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).not.toContain("leaked");
  });

  it("maps codes to HTTP statuses", () => {
    expect(statusFor("RATE_LIMITED")).toBe(429);
    expect(statusFor("NOT_FOUND")).toBe(404);
    expect(statusFor("TOO_LARGE")).toBe(413);
    expect(statusFor("UNAUTHORIZED")).toBe(401);
  });

  it("ok() wraps data", async () => {
    const res = ok({ hello: true });
    const body = (await res.json()) as { data: { hello: boolean } };
    expect(body.data).toEqual({ hello: true });
  });
});
