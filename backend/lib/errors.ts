export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "TIMEOUT"
  | "TOO_LARGE"
  | "INTERNAL_ERROR";

export interface ApiErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  toEnvelope(): ApiErrorEnvelope {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data }, { status: 200, ...init });
}

export function fail(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: unknown,
  init?: ResponseInit,
): Response {
  return Response.json({ error: { code, message, details } }, { status, ...init });
}

export function statusFor(code: ErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "NOT_FOUND":
      return 404;
    case "RATE_LIMITED":
      return 429;
    case "PROVIDER_ERROR":
      return 502;
    case "TIMEOUT":
      return 504;
    case "TOO_LARGE":
      return 413;
    case "INTERNAL_ERROR":
      return 500;
  }
}

/** Convert any thrown value into the standard error envelope Response. */
export function toErrorResponse(e: unknown): Response {
  if (e instanceof AppError) {
    return Response.json(e.toEnvelope(), { status: e.status });
  }
  // Unexpected error — log server-side, never leak internals to the client.
  console.error("[grabytclip] unhandled error:", e);
  return fail("INTERNAL_ERROR", "An unexpected error occurred", 500);
}
