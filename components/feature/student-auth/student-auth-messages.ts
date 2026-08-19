export function studentAuthErrorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "";
}

export function studentAuthErrorMessage(error: unknown): string {
  const code = studentAuthErrorCode(error);
  const messages: Record<string, string> = {
    IDENTITY_EXISTS: "That email or student ID is already registered.",
    INVALID_OTP: "That OTP is not correct. Check the message and try again.",
    OTP_EXPIRED: "This OTP has expired. Request a new one.",
    OTP_ATTEMPTS_EXCEEDED: "Too many incorrect attempts. Request a new OTP.",
    OTP_RATE_LIMITED: "A new OTP was sent recently. Please wait 60 seconds.",
    STUDENT_NOT_FOUND: "No unverified student account was found for this email.",
    ALREADY_VERIFIED: "This student account is already verified. You can sign in.",
    ACCOUNT_UNVERIFIED: "Verify your account before signing in.",
    INVALID_CREDENTIALS: "The email or password is incorrect.",
    VALIDATION_ERROR: "Check the highlighted fields and try again.",
  };
  if (messages[code]) return messages[code];
  if (error && typeof error === "object" && "details" in error) {
    const details = (error as { details?: Record<string, string[]> }).details;
    const firstDetail = details && Object.values(details)[0]?.[0];
    if (firstDetail) return firstDetail;
  }
  if (error && typeof error === "object" && "error" in error) return String((error as { error?: string }).error || "Request failed");
  return typeof error === "string" ? error : "Request failed. Please try again.";
}