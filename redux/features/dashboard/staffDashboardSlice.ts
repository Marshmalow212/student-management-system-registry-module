import { createSlice } from "@reduxjs/toolkit";
import { clearRequestError, idleRequestState, setRequestError, type RequestState } from "../api";
import { fetchStaffDashboard, type StaffDashboardSummary } from "./staffDashboardThunk";

interface StaffDashboardState extends RequestState {
  summary: StaffDashboardSummary | null;
}

const initialState: StaffDashboardState = { ...idleRequestState, summary: null };

export const staffDashboardSlice = createSlice({
  name: "staffDashboard",
  initialState,
  reducers: { clearStaffDashboardError: clearRequestError },
  extraReducers: (builder) =>
    builder
      .addCase(fetchStaffDashboard.pending, (state) => {
        state.isLoading = true;
        clearRequestError(state);
      })
      .addCase(fetchStaffDashboard.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchStaffDashboard.rejected, (state, action) => {
        state.isLoading = false;
        setRequestError(state, action.payload);
      }),
});

export const { clearStaffDashboardError } = staffDashboardSlice.actions;
export default staffDashboardSlice.reducer;
