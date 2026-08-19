// Tests for POST /api/auth/register
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { UserRole } from "@/lib/auth/roles";
import { LogEvent } from "@/lib/auth/log-events";
import { requireRole } from "@/lib/auth-guards";

// Mock modules
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth/password", () => ({
  hashPassword: jest.fn(),
}));

jest.mock("@/lib/auth-guards", () => ({
  requireRole: jest.fn(),
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({
      user: {
        id: 99,
        email: "admin@example.com",
        name: "Admin User",
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date("2024-01-01"),
      },
    });
  });

  it("should reject registration without authentication", async () => {
    (requireRole as jest.Mock).mockResolvedValue({
      user: null,
      error: Response.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    });

    const response = await registerHandler(
      new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("UNAUTHORIZED");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("should reject registration for non-admin staff", async () => {
    (requireRole as jest.Mock).mockResolvedValue({
      user: null,
      error: Response.json(
        { error: "Forbidden: insufficient permissions", code: "FORBIDDEN" },
        { status: 403 },
      ),
    });

    const response = await registerHandler(
      new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.code).toBe("FORBIDDEN");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("should successfully register staff user with valid data", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (hashPassword as jest.Mock).mockResolvedValue("hashed-password");
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 1,
      email: "newstaff@example.com",
      name: "New Staff",
      role: UserRole.STAFF,
      passwordHash: "should-not-be-returned",
    });

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "192.168.1.1",
        "user-agent": "Mozilla/5.0",
      },
      body: JSON.stringify({
        email: "newstaff@example.com",
        name: "New Staff",
        password: "password123",
        role: UserRole.STAFF,
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.email).toBe("newstaff@example.com");
    expect(data.user.role).toBe(UserRole.STAFF);
    expect(data.message).toBe("User registered successfully");
    expect(data.user).not.toHaveProperty("passwordHash");
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "newstaff@example.com",
        name: "New Staff",
        passwordHash: "hashed-password",
        role: UserRole.STAFF,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
    expect(prisma.userLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          eventType: LogEvent.REGISTER,
        }),
      }),
    );
  });

  it("should successfully register admin user with valid data", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (hashPassword as jest.Mock).mockResolvedValue("hashed-password");
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 2,
      email: "newadmin@example.com",
      name: "New Admin",
      role: UserRole.ADMIN,
    });

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "newadmin@example.com",
        name: "New Admin",
        password: "adminpass123",
        role: UserRole.ADMIN,
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.role).toBe(UserRole.ADMIN);
  });

  it("should successfully register registrar user with valid data", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (hashPassword as jest.Mock).mockResolvedValue("hashed-password");
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 3,
      email: "newregistrar@example.com",
      name: "New Registrar",
      role: UserRole.REGISTRAR,
    });

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "newregistrar@example.com",
        name: "New Registrar",
        password: "registrarpass123",
        role: UserRole.REGISTRAR,
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.role).toBe(UserRole.REGISTRAR);
  });

  it("should reject registration with invalid email format", async () => {
    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "invalid-email",
        name: "New Staff",
        password: "password123",
        role: UserRole.STAFF,
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details.email).toContain("Invalid email");
  });

  it("should reject registration with password too short", async () => {
    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "newstaff@example.com",
        name: "New Staff",
        password: "short",
        role: UserRole.STAFF,
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details.password).toContain(
      "Password must be at least 8 characters",
    );
  });

  it("should reject registration with empty name", async () => {
    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "newstaff@example.com",
        name: "",
        password: "password123",
        role: UserRole.STAFF,
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details.name).toContain("Name is required");
  });

  it("should reject registration with invalid role (student role)", async () => {
    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "newuser@example.com",
        name: "New User",
        password: "password123",
        role: UserRole.STUDENT,
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details.role).toBeDefined();
  });

  it("should reject registration with invalid role (out of range)", async () => {
    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "newuser@example.com",
        name: "New User",
        password: "password123",
        role: 99,
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("should reject registration with existing email", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      email: "existing@example.com",
    });

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "existing@example.com",
        name: "New Staff",
        password: "password123",
        role: UserRole.STAFF,
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("Email already registered");
    expect(data.code).toBe("EMAIL_EXISTS");
    expect(prisma.userLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: null,
          eventType: LogEvent.REGISTER,
          metadata: expect.objectContaining({ reason: "email_exists" }),
        }),
      }),
    );
  });

  it("should trim and lowercase email", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (hashPassword as jest.Mock).mockResolvedValue("hashed-password");
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 1,
      email: "newstaff@example.com",
      name: "New Staff",
      role: UserRole.STAFF,
    });

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "  NEWSTAFF@EXAMPLE.COM  ",
        name: "New Staff",
        password: "password123",
        role: UserRole.STAFF,
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "newstaff@example.com",
        name: "New Staff",
        passwordHash: "hashed-password",
        role: UserRole.STAFF,
        isActive: true,
      },
      select: expect.any(Object),
    });
  });

  it("should handle database errors gracefully", async () => {
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "newstaff@example.com",
        name: "New Staff",
        password: "password123",
        role: UserRole.STAFF,
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(data.code).toBe("INTERNAL_ERROR");
  });

  it("should reject registration with missing required fields", async () => {
    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "newstaff@example.com",
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details).toBeDefined();
  });
});
