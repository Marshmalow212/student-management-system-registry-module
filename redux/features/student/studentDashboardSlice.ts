import { createSlice } from "@reduxjs/toolkit";
import {
  clearRequestError,
  idleRequestState,
  setRequestError,
  type RequestState,
} from "../api";
import {
  fetchStudentDashboard,
  type StudentDashboardSummary,
} from "./studentDashboardThunk";

interface StudentDashboardState extends RequestState {
  summary: StudentDashboardSummary | null;
}

const initialState: StudentDashboardState = {
  ...idleRequestState,
  summary: null,
};

const pending = (state: StudentDashboardState) => {
  state.isLoading = true;
  clearRequestError(state);
};

const rejected = (
  state: StudentDashboardState,
  action: { payload?: { error: string; code?: string } },
) => {
  state.isLoading = false;
  setRequestError(state, action.payload);
};

export const studentDashboardSlice = createSlice({
  name: "studentDashboard",
  initialState,
  reducers: {
    clearStudentDashboardError: clearRequestError,
  },
  extraReducers: (builder) =>
    builder
      .addCase(fetchStudentDashboard.pending, pending)
      .addCase(fetchStudentDashboard.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchStudentDashboard.rejected, rejected),
});

export const { clearStudentDashboardError } = studentDashboardSlice.actions;
export default studentDashboardSlice.reducer;
