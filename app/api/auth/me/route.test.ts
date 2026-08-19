// Tests for GET /api/auth/me
import { GET as meHandler } from "@/app/api/auth/me/route";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/auth/roles";

// Mock modules
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name) => ({
      value: "valid-session-token",
    })),
  })),
}));

jest.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE_NAME: "sms_session",
  verifySession: jest.fn((value) => (value ? 1 : null)),
}));

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    require("@/lib/auth/session").verifySession = jest.fn(() => 1);
  });

  it("should return current user info for authenticated staff user", async () => {
    const mockUser = {
      id: 1,
      email: "staff@example.com",
      name: "Staff User",
      role: UserRole.STAFF,
      isActive: true,
      createdAt: new Date("2024-01-01"),
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const request = new Request("http://localhost:3000/api/auth/me", {
      method: "GET",
    });

    const response = await meHandler();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).toEqual({
      ...mockUser,
      createdAt: mockUser.createdAt.toISOString(),
    });
    expect(data.user.email).toBe("staff@example.com");
    expect(data.user.role).toBe(UserRole.STAFF);
  });

  it("should return current user info for authenticated admin user", async () => {
    const mockUser = {
      id: 2,
      email: "admin@example.com",
      name: "Admin User",
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date("2024-01-02"),
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const response = await meHandler();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.role).toBe(UserRole.ADMIN);
  });

  it("should return current user info for authenticated registrar user", async () => {
    const mockUser = {
      id: 3,
      email: "registrar@example.com",
      name: "Registrar User",
      role: UserRole.REGISTRAR,
      isActive: true,
      createdAt: new Date("2024-01-03"),
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const response = await meHandler();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.role).toBe(UserRole.REGISTRAR);
  });

  it("should reject request without valid session", async () => {
    require("@/lib/auth/session").verifySession = jest.fn(() => null);

    const response = await meHandler();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("should reject request for inactive user", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await meHandler();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should reject request when user no longer exists", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await meHandler();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("should not include passwordHash in response", async () => {
    const mockUser = {
      id: 1,
      email: "staff@example.com",
      name: "Staff User",
      role: UserRole.STAFF,
      isActive: true,
      createdAt: new Date("2024-01-01"),
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const response = await meHandler();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user).not.toHaveProperty("passwordHash");
  });

  it("should handle database errors gracefully", async () => {
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await meHandler();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(data.code).toBe("INTERNAL_ERROR");
  });

  it("should verify session before fetching user", async () => {
    const mockUser = {
      id: 1,
      email: "staff@example.com",
      name: "Staff User",
      role: UserRole.STAFF,
      isActive: true,
      createdAt: new Date("2024-01-01"),
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const response = await meHandler();

    expect(response.status).toBe(200);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        studentId: true,
        isActive: true,
        createdAt: true,
      },
    });
  });
});
