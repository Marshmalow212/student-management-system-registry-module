import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosInstance } from "@/lib/axios-client";
import { errorPayload, type ApiEnvelope, type ApiErrorPayload } from "../api";

type FeatureThunkConfig = { rejectValue: ApiErrorPayload };

export type StaffDashboardSummary = {
  assessmentCount: number;
  submissionCount: number;
  publishedAssessmentCount: number;
  pendingResultAssessmentCount: number;
};

export const fetchStaffDashboard = createAsyncThunk<
  StaffDashboardSummary,
  void,
  FeatureThunkConfig
>("staffDashboard/fetch", async (_, { rejectWithValue }) => {
  try {
    const response = await AxiosInstance.get<ApiEnvelope<StaffDashboardSummary>>(
      "/api/dashboard/staff",
    );
    return response.data.data;
  } catch (error) {
    return rejectWithValue(errorPayload(error, "Could not load staff dashboard"));
  }
});
