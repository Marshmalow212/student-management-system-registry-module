import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosInstance } from "@/lib/axios-client";
import { errorPayload, type ApiEnvelope, type ApiErrorPayload } from "../api";

type FeatureThunkConfig = { rejectValue: ApiErrorPayload };

export type StudentDashboardSummary = {
  outstandingBalance: string;
  submissionCount: number;
  overdueSubmissionCount: number;
  lastResultGrade: string | null;
  paidTotal: string;
  hasOverdueBalance: boolean;
  lastDueDate: string | null;
};

export const fetchStudentDashboard = createAsyncThunk<
  StudentDashboardSummary,
  void,
  FeatureThunkConfig
>("studentDashboard/fetch", async (_, { rejectWithValue }) => {
  try {
    const response = await AxiosInstance.get<
      ApiEnvelope<StudentDashboardSummary>
    >("/api/student/dashboard");
    return response.data.data;
  } catch (error) {
    return rejectWithValue(
      errorPayload(error, "Could not load dashboard summary"),
    );
  }
});
