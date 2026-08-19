import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosInstance } from "@/lib/axios-client";
import { errorPayload, type ApiEnvelope, type ApiErrorPayload } from "../api";

export type EnrollmentStatus = 0 | 1 | 2 | 3;
export type EnrollmentStatusUpdate = {
  id: number;
  status: EnrollmentStatus;
};

export type EnrollmentEnrolledFeeUpdate = {
  id: number;
};
export type EnrollmentRecord = Record<string, unknown> & {
  id: number;
  status: EnrollmentStatus;
};

type FeatureThunkConfig = { rejectValue: ApiErrorPayload };

export const updateEnrollmentStatus = createAsyncThunk<
  EnrollmentRecord,
  EnrollmentStatusUpdate,
  FeatureThunkConfig
>("enrollment/updateStatus", async ({ id, status }, { rejectWithValue }) => {
  try {
    return (
      await AxiosInstance.patch<ApiEnvelope<EnrollmentRecord>>(
        `/api/enrollments/${id}`,
        { status },
      )
    ).data.data;
  } catch (error) {
    return rejectWithValue(
      errorPayload(error, "Could not update enrollment status"),
    );
  }
});

export const updateEnrolledFee = createAsyncThunk<
  EnrollmentRecord,
  EnrollmentEnrolledFeeUpdate,
  FeatureThunkConfig
>("enrollment/updateEnrolledFee", async ({ id }, { rejectWithValue }) => {
  try {
    return (
      await AxiosInstance.patch<ApiEnvelope<EnrollmentRecord>>(
        `/api/enrollments/add-remaining/${id}`,
        { },
      )
    ).data.data;
  } catch (error) {
    return rejectWithValue(
      errorPayload(error, "Could not update enrollment status"),
    );
  }
});
