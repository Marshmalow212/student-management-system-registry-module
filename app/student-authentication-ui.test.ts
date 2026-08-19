import { configureStore } from "@reduxjs/toolkit";
import { AxiosInstance } from "@/lib/axios-client";
import authReducer from "@/redux/features/auth/authSlice";
import { studentLoginThunk, studentRegisterThunk, studentResendThunk, studentVerifyThunk } from "@/redux/features/auth/authThunk";
import type { AppDispatch } from "@/redux/store";

jest.mock("@/lib/axios-client", () => ({ AxiosInstance: { post: jest.fn() } }));
const post = AxiosInstance.post as jest.Mock;

function createTestStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

describe("student authentication UI Redux contract", () => {
  beforeEach(() => post.mockReset());

  it("stores public registration metadata and no secret fields", async () => {
    post.mockResolvedValue({ status: 201, data: { user: { id: 7, email: "student@example.com", name: "A Student", studentId: "S-1007", role: 0, isVerified: false } } });
    const store = createTestStore();
    await (store.dispatch as AppDispatch)(studentRegisterThunk({ email: "student@example.com", name: "A Student", studentId: "S-1007", password: "password123" }));
    expect(store.getState().auth).toMatchObject({ isRegistered: true, email: "student@example.com", studentId: "S-1007", role: 0, isVerified: false });
    expect(store.getState().auth).not.toHaveProperty("password");
    expect(store.getState().auth).not.toHaveProperty("otp");
    expect(post).toHaveBeenCalledWith("/api/auth/student/register", {
      email: "student@example.com", name: "A Student", studentId: "S-1007", password: "password123",
    });
  });

  it("marks the student authenticated only after verification", async () => {
    post.mockResolvedValue({ status: 200, data: { user: { id: 7, email: "student@example.com", name: "A Student", studentId: "S-1007", role: 0, isVerified: true } } });
    const store = createTestStore();
    await (store.dispatch as AppDispatch)(studentVerifyThunk({ email: "student@example.com", otp: "123456" }));
    expect(store.getState().auth).toMatchObject({ isAuthenticated: true, isVerified: true, role: 0 });
    expect(post).toHaveBeenCalledWith("/api/auth/student/verify", { email: "student@example.com", otp: "123456" });
  });

  it("uses the resend contract and preserves stable API errors", async () => {
    post.mockResolvedValue({ status: 200, data: { message: "A new OTP was sent" } });
    const store = createTestStore();
    await expect((store.dispatch as AppDispatch)(studentResendThunk({ email: "student@example.com" })).unwrap()).resolves.toBe("A new OTP was sent");
    expect(post).toHaveBeenCalledWith("/api/auth/student/resend", { email: "student@example.com" });

    post.mockRejectedValue({ response: { data: { error: "Please wait", code: "OTP_RATE_LIMITED" } }, isAxiosError: true });
    await expect((store.dispatch as AppDispatch)(studentResendThunk({ email: "student@example.com" })).unwrap()).rejects.toMatchObject({ code: "OTP_RATE_LIMITED" });
  });

  it("keeps a structured fallback when a client response has the wrong status", async () => {
    post.mockResolvedValue({ status: 201, data: { user: {} } });
    const store = createTestStore();
    await expect((store.dispatch as AppDispatch)(studentLoginThunk({ email: "student@example.com", password: "password123" })).unwrap()).rejects.toMatchObject({ error: "Login failed" });
  });

  it("retains stable API error codes for the UI", async () => {
    post.mockRejectedValue({ response: { data: { error: "Account verification required", code: "ACCOUNT_UNVERIFIED" } }, isAxiosError: true });
    const store = createTestStore();
    await expect((store.dispatch as AppDispatch)(studentLoginThunk({ email: "student@example.com", password: "password123" })).unwrap()).rejects.toMatchObject({ code: "ACCOUNT_UNVERIFIED" });
    expect(store.getState().auth).toMatchObject({ errorCode: "ACCOUNT_UNVERIFIED", isAuthenticated: false });
  });
});