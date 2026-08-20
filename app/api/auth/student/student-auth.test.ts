import { POST as register } from "@/app/api/auth/student/register/route";
import { POST as verify } from "@/app/api/auth/student/verify/route";
import { POST as resend } from "@/app/api/auth/student/resend/route";
import { POST as login } from "@/app/api/auth/student/login/route";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { deliverStudentOtp } from "@/lib/auth/otp";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    student: { findUnique: jest.fn(), update: jest.fn() },
    userLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/auth/password", () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

jest.mock("@/lib/auth/otp", () => ({
  createOtp: jest.fn(() => ({ code: "123456", hash: "otp-hash", expiresAt: new Date(Date.now() + 600000) })),
  deliverStudentOtp: jest.fn(),
  isOtpMatch: jest.fn((otp: string) => otp === "123456"),
  OTP_MAX_ATTEMPTS: 5,
  OTP_RESEND_COOLDOWN_MS: 60000,
}));

const cookieSet = jest.fn();
jest.mock("next/headers", () => ({ cookies: jest.fn(async () => ({ set: cookieSet })) }));

const student = {
  id: 7,
  email: "student@example.com",
  name: "A Student",
  studentId: "S-7",
  passwordHash: "password-hash",
  role: 0,
  isActive: true,
  isVerified: false,
  otpHash: "otp-hash",
  otpExpiresAt: new Date(Date.now() + 600000),
  otpAttempts: 0,
  otpSentAt: new Date(Date.now() - 120000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const request = (path: string, body: unknown) =>
  new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("student authentication API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (hashPassword as jest.Mock).mockResolvedValue("password-hash");
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    (prisma.userLog.create as jest.Mock).mockResolvedValue({ id: 1 });
  });

  it("registers an unverified student and never returns secrets", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.student.findUnique as jest.Mock).mockResolvedValue({ id: 9 });
    (prisma.user.create as jest.Mock).mockResolvedValue(student);

    const response = await register(request("/api/auth/student/register", {
      email: " STUDENT@EXAMPLE.COM ", name: "A Student", studentId: "S-7", password: "password123",
    }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user).toEqual(expect.objectContaining({ email: "student@example.com", role: 0, isVerified: false }));
    expect(data.user).not.toHaveProperty("passwordHash");
    expect(data.user).not.toHaveProperty("otpHash");
    expect(deliverStudentOtp).toHaveBeenCalledWith("student@example.com", "123456");
  });

  it("rejects duplicate email or student identity", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    const response = await register(request("/api/auth/student/register", {
      email: "student@example.com", name: "A Student", studentId: "S-7", password: "password123",
    }));
    const data = await response.json();
    expect(response.status).toBe(409);
    expect(data.code).toBe("IDENTITY_EXISTS");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("verifies a valid OTP, clears OTP state, and sets a session cookie", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(student);
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...student, isVerified: true, otpHash: null });
    (prisma.student.update as jest.Mock).mockResolvedValue({ id: 9 });
    const response = await verify(request("/api/auth/student/verify", { email: student.email, otp: "123456" }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.user).not.toHaveProperty("passwordHash");
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ isVerified: true, otpHash: null, otpExpiresAt: null }) }));
    expect(cookieSet).toHaveBeenCalled();
  });

  it("rejects expired OTPs and increments invalid attempts", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...student, otpExpiresAt: new Date(Date.now() - 1) });
    let response = await verify(request("/api/auth/student/verify", { email: student.email, otp: "123456" }));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("OTP_EXPIRED");

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(student);
    const otpModule = jest.requireMock("@/lib/auth/otp");
    otpModule.isOtpMatch.mockReturnValueOnce(false);
    response = await verify(request("/api/auth/student/verify", { email: student.email, otp: "999999" }));
    expect(response.status).toBe(400);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { otpAttempts: { increment: 1 } } }));
  });

  it("enforces resend cooldown", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...student, otpSentAt: new Date() });
    const response = await resend(request("/api/auth/student/resend", { email: student.email }));
    expect(response.status).toBe(429);
    expect((await response.json()).code).toBe("OTP_RATE_LIMITED");
    expect(deliverStudentOtp).not.toHaveBeenCalled();
  });

  it("does not authenticate an unverified student, then logs in a verified one", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(student);
    let response = await login(request("/api/auth/student/login", { email: student.email, password: "password123" }));
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("ACCOUNT_UNVERIFIED");

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...student, isVerified: true });
    response = await login(request("/api/auth/student/login", { email: student.email, password: "password123" }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.user).not.toHaveProperty("passwordHash");
    expect(cookieSet).toHaveBeenCalled();
  });
});