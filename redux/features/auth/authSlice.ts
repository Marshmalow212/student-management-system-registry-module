import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/redux/store'
import { createStaffAccountThunk, loginThunk, logoutThunk, registerThunk, studentLoginThunk, studentRegisterThunk, studentResendThunk, studentVerifyThunk } from './authThunk';
import type { AuthErrorPayload, StudentUser } from './authThunk';


interface AuthStateType {
  isAuthenticated: boolean;
  email: string | null;
  role: number | null;
  is_loading: boolean;
  isRegistered: boolean;
  name: string | null;
  studentId: string | null;
  isVerified: boolean;
  errorCode: string | null;
  error: string | null;
}

const initialState: AuthStateType = {
  isAuthenticated: false,
  email: null,
  role: null,
  is_loading: false,
  isRegistered: false,
  name: null,
  studentId: null,
  isVerified: false,
  errorCode: null,
  error: null,
}

function processErrorPayload(payload: AuthErrorPayload | string | undefined): string {
  if (typeof payload === "string") {
    return payload;
  } else if (payload && typeof payload === "object" && payload.details) {
    const payloadValues = Object.values(payload.details);
    if (payloadValues.length > 0 && Array.isArray(payloadValues[0]) && payloadValues[0].length > 0) {
      return payloadValues[0][0] as string; // Return the first error message
    }
    return "An unknown error occurred";
  } else if (payload && typeof payload === "object" && "error" in payload) {
    return payload.error;
  }

  return "An unknown error occurred";
}

function applyStudentUser(state: AuthStateType, user: StudentUser) {
  state.email = user.email;
  state.name = user.name;
  state.studentId = user.studentId;
  state.role = user.role;
  state.isVerified = user.isVerified ?? state.isVerified;
}

function clearError(state: AuthStateType) {
  state.error = null;
  state.errorCode = null;
}

function setError(state: AuthStateType, payload: AuthErrorPayload | string | undefined) {
  state.error = processErrorPayload(payload);
  state.errorCode = typeof payload === "object" && payload ? payload.code ?? null : null;
}


export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ email: string; role: number; name: string }>) => {
      state.isAuthenticated = true;
      state.email = action.payload.email;
      state.role = action.payload.role;
      state.name = action.payload.name;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.email = null;
      state.role = null;
      state.name = null;
      state.studentId = null;
      state.isVerified = false;
      state.error = null;
      state.errorCode = null;
    },
    check_data: (state, action: PayloadAction<{ email?: string; role?: number; name?: string }>) => {
      state.isAuthenticated = true;
      state.email = action.payload.email ?? null;
      state.role = action.payload.role ?? null;
      state.name = action.payload.name ?? null;
      state.errorCode = null;
    },
  },
  extraReducers: (builder) => {
    // You can add extra reducers here if needed
    builder.
      addCase(loginThunk.pending, (state) => {
        state.isAuthenticated = false;
        state.email = null;
        state.role = null;
        state.name = null;
        state.is_loading = true;
        state.error = null;
      })
      .
      addCase(loginThunk.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.email = action.payload.email;
        state.role = action.payload.role;
        state.name = action.payload.name;
        state.is_loading = false;
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.email = null;
        state.role = null;
        state.name = null;
        state.is_loading = false;
        setError(state, action.payload as AuthErrorPayload | undefined);
      })
      .addCase(logoutThunk.pending, (state) => {
        state.is_loading = true;
        clearError(state);
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.email = null;
        state.role = null;
        state.name = null;
        state.studentId = null;
        state.isVerified = false;
        state.is_loading = false;
        clearError(state);
      })
      .addCase(logoutThunk.rejected, (state, action) => {
        state.is_loading = false;
        setError(state, action.payload);
      })
      .addCase(registerThunk.pending, (state) => {
        state.email = null;
        state.role = null;
        state.name = null;
        state.is_loading = true;
        state.isRegistered = false;
        clearError(state);

      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        return {
          ...state,
          ...action.payload,
          isRegistered: true,
          is_loading: false,
          error: null,
        };
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.email = null;
        state.role = null;
        state.name = null;
        state.is_loading = false;
        state.isRegistered = false;
        setError(state, action?.payload);
      })
      .addCase(createStaffAccountThunk.pending, (state) => {
        state.is_loading = true;
        state.isRegistered = false;
        clearError(state);
      })
      .addCase(createStaffAccountThunk.fulfilled, (state) => {
        state.is_loading = false;
        state.isRegistered = true;
        clearError(state);
      })
      .addCase(createStaffAccountThunk.rejected, (state, action) => {
        state.is_loading = false;
        state.isRegistered = false;
        setError(state, action.payload);
      })
      .addCase(studentRegisterThunk.pending, (state) => {
        state.is_loading = true;
        state.isRegistered = false;
        state.isAuthenticated = false;
        clearError(state);
      })
      .addCase(studentRegisterThunk.fulfilled, (state, action) => {
        applyStudentUser(state, action.payload);
        state.isAuthenticated = false;
        state.isRegistered = true;
        state.is_loading = false;
        clearError(state);
      })
      .addCase(studentRegisterThunk.rejected, (state, action) => {
        state.is_loading = false;
        state.isRegistered = false;
        setError(state, action.payload);
      })
      .addCase(studentVerifyThunk.pending, (state) => {
        state.is_loading = true;
        clearError(state);
      })
      .addCase(studentVerifyThunk.fulfilled, (state, action) => {
        applyStudentUser(state, action.payload);
        state.isAuthenticated = true;
        state.isVerified = true;
        state.is_loading = false;
        clearError(state);
      })
      .addCase(studentVerifyThunk.rejected, (state, action) => {
        state.is_loading = false;
        setError(state, action.payload);
      })
      .addCase(studentResendThunk.pending, (state) => {
        state.is_loading = true;
        clearError(state);
      })
      .addCase(studentResendThunk.fulfilled, (state) => {
        state.is_loading = false;
        clearError(state);
      })
      .addCase(studentResendThunk.rejected, (state, action) => {
        state.is_loading = false;
        setError(state, action.payload);
      })
      .addCase(studentLoginThunk.pending, (state) => {
        state.is_loading = true;
        clearError(state);
      })
      .addCase(studentLoginThunk.fulfilled, (state, action) => {
        applyStudentUser(state, action.payload);
        state.isAuthenticated = true;
        state.isVerified = true;
        state.is_loading = false;
        clearError(state);
      })
      .addCase(studentLoginThunk.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.is_loading = false;
        setError(state, action.payload);
      });
  },
});

export const { login, logout, check_data } = authSlice.actions

export const selectAuth = (state: RootState) => state.auth

export default authSlice.reducer