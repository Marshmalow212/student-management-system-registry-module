import { createAsyncThunk, type GetThunkAPI } from "@reduxjs/toolkit";
import type { ThunkApiConfig } from "@/redux/store";
import { AxiosInstance } from "@/lib/axios-client";
import axios from "axios";

export interface AuthErrorPayload {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface StudentUser {
  id: number;
  email: string;
  name: string;
  studentId: string;
  role: number;
  isVerified?: boolean;
}

export interface StudentRegistrationInput {
  email: string;
  name: string;
  studentId: string;
  password: string;
}

function getErrorPayload(error: unknown, fallback: string): AuthErrorPayload {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as Partial<AuthErrorPayload>;
    return {
      error: data.error || fallback,
      code: data.code,
      details: data.details,
    };
  }

  return { error: fallback };
}

function isAuthErrorPayload(error: unknown): error is AuthErrorPayload {
  return !!error && typeof error === "object" && "error" in error;
}

export const loginThunk = createAsyncThunk<
  { id: number; email: string; name: string; role: number },
  { email: string; password: string },
  ThunkApiConfig
>("auth/login", async (data, thunkApi: GetThunkAPI<ThunkApiConfig>) => {
  try {
    const response = await AxiosInstance.post("/api/auth/login", data);
    if (response.status === 200) {
      return response.data.user;
    }

    return thunkApi.rejectWithValue({ error: "Login failed" });
  } catch (error) {
    return thunkApi.rejectWithValue(getErrorPayload(error, "Login failed"));
  }
});

export const logoutThunk = createAsyncThunk<void, void, ThunkApiConfig>(
  "auth/logout",
  async (_, thunkApi) => {
    try {
      const response = await AxiosInstance.post("/api/auth/logout");
      if (response.status !== 200) {
        return thunkApi.rejectWithValue({ error: "Logout failed" });
      }
    } catch (error) {
      return thunkApi.rejectWithValue(getErrorPayload(error, "Logout failed"));
    }
  },
);

export const registerThunk = createAsyncThunk<
  { id: number; email: string; name: string; role: number },
  { email: string; name: string; password: string; role: number },
  ThunkApiConfig
>("auth/register", async (data, thunkApi: GetThunkAPI<ThunkApiConfig>) => {
  try {
    const response = await AxiosInstance.post("/api/auth/register", data);
    if (response.status === 201) {
      return response.data.user;
    }

    return thunkApi.rejectWithValue({ error: "Registration failed" });
  } catch (error) {
    return thunkApi.rejectWithValue(
      getErrorPayload(error, "Registration failed"),
    );
  }
});

export const createStaffAccountThunk = createAsyncThunk<
  { id: number; email: string; name: string; role: number },
  { email: string; name: string; password: string; role: number },
  ThunkApiConfig
>("auth/createStaffAccount", async (data, thunkApi) => {
  try {
    const response = await AxiosInstance.post("/api/auth/register", data);
    if (response.status === 201) {
      return response.data.user;
    }

    return thunkApi.rejectWithValue({ error: "Account creation failed" });
  } catch (error) {
    return thunkApi.rejectWithValue(
      getErrorPayload(error, "Account creation failed"),
    );
  }
});

async function postStudent<T>(
  endpoint: string,
  data: object,
  fallback: string,
  expectedStatus: number,
): Promise<T> {
  try {
    const response = await AxiosInstance.post(endpoint, data);
    if (response.status !== expectedStatus)
      throw { error: fallback } satisfies AuthErrorPayload;
    return response.data as T;
  } catch (error) {
    if (isAuthErrorPayload(error)) throw error;
    throw getErrorPayload(error, fallback);
  }
}

export const studentRegisterThunk = createAsyncThunk<
  StudentUser,
  StudentRegistrationInput,
  ThunkApiConfig
>("auth/studentRegister", async (data, thunkApi) => {
  try {
    const response = await postStudent<{ user: StudentUser }>(
      "/api/auth/student/register",
      data,
      "Registration failed",
      201,
    );
    return response.user;
  } catch (error) {
    return thunkApi.rejectWithValue(error as AuthErrorPayload);
  }
});

export const studentVerifyThunk = createAsyncThunk<
  StudentUser,
  { email: string; otp: string },
  ThunkApiConfig
>("auth/studentVerify", async (data, thunkApi) => {
  try {
    const response = await postStudent<{ user: StudentUser }>(
      "/api/auth/student/verify",
      data,
      "Verification failed",
      200,
    );
    return response.user;
  } catch (error) {
    return thunkApi.rejectWithValue(error as AuthErrorPayload);
  }
});

export const studentResendThunk = createAsyncThunk<
  string,
  { email: string },
  ThunkApiConfig
>("auth/studentResend", async (data, thunkApi) => {
  try {
    const response = await postStudent<{ message: string }>(
      "/api/auth/student/resend",
      data,
      "Could not resend OTP",
      200,
    );
    return response.message;
  } catch (error) {
    return thunkApi.rejectWithValue(error as AuthErrorPayload);
  }
});

export const studentLoginThunk = createAsyncThunk<
  StudentUser,
  { email: string; password: string },
  ThunkApiConfig
>("auth/studentLogin", async (data, thunkApi) => {
  try {
    const response = await postStudent<{ user: StudentUser }>(
      "/api/auth/student/login",
      data,
      "Login failed",
      200,
    );
    return response.user;
  } catch (error) {
    return thunkApi.rejectWithValue(error as AuthErrorPayload);
  }
});
