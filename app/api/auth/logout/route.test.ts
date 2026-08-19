// Tests for POST /api/auth/logout
import { POST as logoutHandler } from "@/app/api/auth/logout/route";
import { prisma } from "@/lib/prisma";
import { LogEvent } from "@/lib/auth/log-events";

// Mock modules
jest.mock("@/lib/prisma", () => ({
  prisma: {
    userLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    set: jest.fn(),
    delete: jest.fn(),
    get: jest.fn((name) => ({
      value: "user-id.exp-time.sig",
    })),
  })),
}));

jest.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE_NAME: "sms_session",
  verifySession: jest.fn((value) => (value ? 1 : null)),
}));

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    require("@/lib/auth/session").verifySession = jest.fn((value) => (value ? 1 : null));
  });

  it("should successfully logout authenticated user", async () => {
    const request = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        "x-forwarded-for": "192.168.1.1",
        "user-agent": "Mozilla/5.0",
      },
    });

    const response = await logoutHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Logged out successfully");
    expect(prisma.userLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          eventType: LogEvent.LOGOUT,
        }),
      }),
    );
  });

  it("should logout even with invalid session", async () => {
    // Mock verifySession to return null
    require("@/lib/auth/session").verifySession = jest.fn(() => null);

    const request = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        "x-forwarded-for": "192.168.1.1",
        "user-agent": "Mozilla/5.0",
      },
    });

    const response = await logoutHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Logged out successfully");
    // UserLog should not be created when there's no valid session
    expect(prisma.userLog.create).not.toHaveBeenCalled();
  });

  it("should clear session cookie on logout", async () => {
    const mockCookieStore = {
      get: jest.fn(() => ({ value: "mock-token" })),
      delete: jest.fn(),
    };
    (require("next/headers").cookies as jest.Mock).mockReturnValue(
      mockCookieStore,
    );

    const request = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {},
    });

    const response = await logoutHandler(request);

    expect(response.status).toBe(200);
    expect(mockCookieStore.delete).toHaveBeenCalledWith("sms_session");
  });

  it("should capture IP address and user agent in logout log", async () => {
    const request = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        "x-forwarded-for": "10.0.0.1",
        "user-agent": "Chrome/120.0",
      },
    });

    const response = await logoutHandler(request);

    expect(response.status).toBe(200);
    expect(prisma.userLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ipAddress: "10.0.0.1",
          userAgent: "Chrome/120.0",
        }),
      }),
    );
  });

  it("should handle missing IP address header", async () => {
    const request = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    });

    const response = await logoutHandler(request);

    expect(response.status).toBe(200);
    expect(prisma.userLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ipAddress: null,
        }),
      }),
    );
  });

  it("should handle database errors gracefully", async () => {
    (prisma.userLog.create as jest.Mock).mockRejectedValue(
      new Error("Database error"),
    );

    const request = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {},
    });

    const response = await logoutHandler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
