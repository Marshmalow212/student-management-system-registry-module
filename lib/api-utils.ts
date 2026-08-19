// Utility functions for API responses and error handling
import { ZodError } from "zod";

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export function jsonResponse<T>(data: T, status: number = 200): Response {
  return Response.json(data, { status });
}

export function errorResponse(
  error: string,
  status: number = 400,
  details?: Record<string, string[]>,
  code?: string,
): Response {
  const body: ApiError = { error, code };
  if (details) body.details = details;
  return Response.json(body, { status });
}

export function validationErrorResponse(zodError: ZodError): Response {
  const details: Record<string, string[]> = {};
  for (const issue of zodError.issues) {
    const key = issue.path.join(".") || "_";
    if (!details[key]) details[key] = [];
    details[key].push(issue.message);
  }
  return errorResponse("Validation failed", 400, details, "VALIDATION_ERROR");
}

export async function getClientInfo(request: Request): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;
  const userAgent = request.headers.get("user-agent") ?? null;
  return { ipAddress, userAgent };
}
