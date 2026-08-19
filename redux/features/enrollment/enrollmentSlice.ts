import { createSlice } from "@reduxjs/toolkit";
import {
  clearRequestError,
  idleRequestState,
  setRequestError,
  type RequestState,
} from "../api";
import { updateEnrolledFee, updateEnrollmentStatus, type EnrollmentRecord } from "./enrollmentThunk";

interface EnrollmentState extends RequestState {
  selected: EnrollmentRecord | null;
}

const initialState: EnrollmentState = {
  ...idleRequestState,
  selected: null,
};

export const enrollmentSlice = createSlice({
  name: "enrollment",
  initialState,
  reducers: {
    clearEnrollmentError: clearRequestError,
    clearEnrollmentSelection: (state) => {
      state.selected = null;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(updateEnrollmentStatus.pending, (state) => {
        state.isSaving = true;
        clearRequestError(state);
      })
      .addCase(updateEnrollmentStatus.fulfilled, (state, action) => {
        state.selected = action.payload;
        state.isSaving = false;
      })
      .addCase(updateEnrollmentStatus.rejected, (state, action) => {
        state.isSaving = false;
        setRequestError(state, action.payload);
      })
      .addCase(updateEnrolledFee.pending, (state) => {
        state.isSaving = true;
        clearRequestError(state);
      })
      .addCase(updateEnrolledFee.fulfilled, (state, action) => {
        state.selected = action.payload;
        state.isSaving = false;
      })
      .addCase(updateEnrolledFee.rejected, (state, action) => {
        state.isSaving = false;
        setRequestError(state, action.payload);
      }),
});

export const { clearEnrollmentError, clearEnrollmentSelection } =
  enrollmentSlice.actions;
export default enrollmentSlice.reducer;
