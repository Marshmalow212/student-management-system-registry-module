// Tests for POST /api/auth/login
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { UserRole } from "@/lib/auth/roles";
import { LogEvent } from "@/lib/auth/log-events";

const mockCookieSet = jest.fn();

// Mock modules
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    userLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth/password", () => ({
  verifyPassword: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    set: mockCookieSet,
  })),
}));

jest.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE_NAME: "sms_session",
  signSession: jest.fn(() => "mock-session-token"),
  sessionCookieOptions: jest.fn(() => ({
    name: "sms_session",
    maxAge: 604800,
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  })),
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully login staff user with valid credentials", async () => {
    const mockUser = {
      id: 1,
      email: "staff@example.com",
      name: "Staff User",
      role: UserRole.STAFF,
      passwordHash: "mocked-hash",
      isActive: true,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (require("@/lib/auth/password").verifyPassword as jest.Mock).mockResolvedValue(true);

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "192.168.1.1",
        "user-agent": "Mozilla/5.0",
      },
      body: JSON.stringify({
        email: "staff@example.com",
        password: "password123",
      }),
    });

    const response = await loginHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.email).toBe("staff@example.com");
    expect(data.user.role).toBe(UserRole.STAFF);
    expect(data.message).toBe("Login successful");
    expect(data.user).not.toHaveProperty("passwordHash");
    expect(data).not.toHaveProperty("password");
    expect(mockCookieSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "sms_session",
        value: "mock-session-token",
        httpOnly: true,
        sameSite: "lax",
      }),
    );
    expect(prisma.userLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          eventType: LogEvent.LOGIN_SUCCESS,
        }),
      }),
    );
  });

  it("should successfully login admin user with valid credentials", async () => {
    const mockUser = {
      id: 2,
      email: "admin@example.com",
      name: "Admin User",
      role: UserRole.ADMIN,
      passwordHash: "mocked-hash",
      isActive: true,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (require("@/lib/auth/password").verifyPassword as jest.Mock).mockResolvedValue(true);

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "adminpass123",
      }),
    });

    const response = await loginHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.role).toBe(UserRole.ADMIN);
  });

  it("should reject login for student user (insufficient role)", async () => {
    const mockUser = {
      id: 3,
      email: "student@example.com",
      name: "Student User",
      role: UserRole.STUDENT,
      passwordHash: "mocked-hash",
      isActive: true,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "student@example.com",
        password: "password123",
      }),
    });

    const response = await loginHandler(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Staff access required");
    expect(data.code).toBe("INSUFFICIENT_ROLE");
    expect(prisma.userLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 3,
          eventType: LogEvent.LOGIN_FAILURE,
          metadata: expect.objectContaining({ reason: "insufficient_role" }),
        }),
      }),
    );
  });

  it("should reject login with invalid email format", async () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "invalid-email",
        password: "password123",
      }),
    });

    const response = await loginHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details).toBeDefined();
    expect(data.details.email).toContain("Invalid email");
  });

  it("should reject login with missing password", async () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "staff@example.com",
      }),
    });

    const response = await loginHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details.password).toContain("Password is required");
  });

  it("should reject login with wrong password", async () => {
    const mockUser = {
      id: 1,
      email: "staff@example.com",
      name: "Staff User",
      role: UserRole.STAFF,
      passwordHash: "mocked-hash",
      isActive: true,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (require("@/lib/auth/password").verifyPassword as jest.Mock).mockResolvedValue(false);

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "staff@example.com",
        password: "wrongpassword",
      }),
    });

    const response = await loginHandler(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid email or password");
    expect(data.code).toBe("INVALID_CREDENTIALS");
    expect(prisma.userLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          eventType: LogEvent.LOGIN_FAILURE,
          metadata: expect.objectContaining({ reason: "bad_password" }),
        }),
      }),
    );
  });

  it("should reject login with non-existent email", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "nonexistent@example.com",
        password: "password123",
      }),
    });

    const response = await loginHandler(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid email or password");
    expect(data.code).toBe("INVALID_CREDENTIALS");
    expect(prisma.userLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: null,
          eventType: LogEvent.LOGIN_FAILURE,
          metadata: expect.objectContaining({ reason: "unknown_user" }),
        }),
      }),
    );
  });

  it("should reject login for inactive user", async () => {
    const mockUser = {
      id: 1,
      email: "inactive@example.com",
      name: "Inactive User",
      role: UserRole.STAFF,
      passwordHash: "mocked-hash",
      isActive: false,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "inactive@example.com",
        password: "password123",
      }),
    });

    const response = await loginHandler(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid email or password");
    expect(prisma.userLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({ reason: "inactive" }),
        }),
      }),
    );
  });

  it("should handle database errors gracefully", async () => {
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "staff@example.com",
        password: "password123",
      }),
    });

    const response = await loginHandler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(data.code).toBe("INTERNAL_ERROR");
  });

  it("should trim and lowercase email", async () => {
    const mockUser = {
      id: 1,
      email: "staff@example.com",
      name: "Staff User",
      role: UserRole.STAFF,
      passwordHash: "mocked-hash",
      isActive: true,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (require("@/lib/auth/password").verifyPassword as jest.Mock).mockResolvedValue(true);

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "  STAFF@EXAMPLE.COM  ",
        password: "password123",
      }),
    });

    const response = await loginHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "staff@example.com" },
      select: expect.any(Object),
    });
  });
});
