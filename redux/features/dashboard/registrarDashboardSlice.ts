import { createSlice } from "@reduxjs/toolkit";
import { clearRequestError, idleRequestState, setRequestError, type RequestState } from "../api";
import { fetchRegistrarDashboard, type RegistrarDashboardSummary } from "./registrarDashboardThunk";

interface RegistrarDashboardState extends RequestState {
  summary: RegistrarDashboardSummary | null;
}

const initialState: RegistrarDashboardState = { ...idleRequestState, summary: null };

export const registrarDashboardSlice = createSlice({
  name: "registrarDashboard",
  initialState,
  reducers: { clearRegistrarDashboardError: clearRequestError },
  extraReducers: (builder) =>
    builder
      .addCase(fetchRegistrarDashboard.pending, (state) => {
        state.isLoading = true;
        clearRequestError(state);
      })
      .addCase(fetchRegistrarDashboard.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchRegistrarDashboard.rejected, (state, action) => {
        state.isLoading = false;
        setRequestError(state, action.payload);
      }),
});

export const { clearRegistrarDashboardError } = registrarDashboardSlice.actions;
export default registrarDashboardSlice.reducer;
