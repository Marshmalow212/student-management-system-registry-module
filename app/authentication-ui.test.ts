import { configureStore } from "@reduxjs/toolkit";
import { AxiosInstance } from "@/lib/axios-client";
import authReducer from "@/redux/features/auth/authSlice";
import { loginThunk, logoutThunk, registerThunk } from "@/redux/features/auth/authThunk";
import type { AppDispatch } from "@/redux/store";

jest.mock("@/lib/axios-client", () => ({
  AxiosInstance: { post: jest.fn() },
}));

const post = AxiosInstance.post as jest.Mock;

function createTestStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

describe("authentication Redux contracts", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("stores only the public user from a successful login", async () => {
    post.mockResolvedValue({
      status: 200,
      data: { user: { id: 1, email: "staff@example.com", name: "Staff User", role: 1 } },
    });
    const store = createTestStore();

    await (store.dispatch as AppDispatch)(loginThunk({ email: "staff@example.com", password: "password123" }));

    expect(store.getState().auth).toMatchObject({
      isAuthenticated: true,
      email: "staff@example.com",
      name: "Staff User",
      role: 1,
      error: null,
    });
    expect(store.getState().auth).not.toHaveProperty("password");
  });

  it("clears the session through the logout API", async () => {
    post.mockResolvedValue({ status: 200, data: { message: "Logged out successfully" } });
    const store = createTestStore();
    store.dispatch({ type: "auth/login/fulfilled", payload: { id: 1, email: "staff@example.com", name: "Staff User", role: 1 } });

    await (store.dispatch as AppDispatch)(logoutThunk());

    expect(post).toHaveBeenCalledWith("/api/auth/logout");
    expect(store.getState().auth).toMatchObject({ isAuthenticated: false, email: null, role: null, name: null });
  });

  it("accepts the 201 registration response envelope", async () => {
    post.mockResolvedValue({
      status: 201,
      data: { user: { id: 2, email: "newstaff@example.com", name: "New Staff", role: 1 } },
    });
    const store = createTestStore();

    await (store.dispatch as AppDispatch)(registerThunk({
      email: "newstaff@example.com",
      name: "New Staff",
      password: "securepassword123",
      role: 1,
    }));

    expect(store.getState().auth).toMatchObject({
      isRegistered: true,
      email: "newstaff@example.com",
      name: "New Staff",
      role: 1,
      error: null,
    });
    expect(store.getState().auth).not.toHaveProperty("password");
  });

  it("exposes the first documented validation detail", async () => {
    post.mockRejectedValue({
      response: {
        data: { error: "Validation failed", code: "VALIDATION_ERROR", details: { email: ["Invalid email"] } },
      },
      isAxiosError: true,
    });
    const store = createTestStore();

    await (store.dispatch as AppDispatch)(loginThunk({ email: "bad", password: "password123" }));

    expect(store.getState().auth).toMatchObject({
      isAuthenticated: false,
      is_loading: false,
      error: "Invalid email",
    });
  });
});