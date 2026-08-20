import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosInstance } from "@/lib/axios-client";
import { errorPayload, type ApiEnvelope, type ApiErrorPayload } from "../api";

type FeatureThunkConfig = { rejectValue: ApiErrorPayload };

export type RegistrarDashboardSummary = {
  totalStudentCount: number;
  enrolledStudentCount: number;
  completedStudentCount: number;
  deferredStudentCount: number;
  withdrawnStudentCount: number;
  overduePaymentStudentCount: number;
};

export const fetchRegistrarDashboard = createAsyncThunk<
  RegistrarDashboardSummary,
  void,
  FeatureThunkConfig
>("registrarDashboard/fetch", async (_, { rejectWithValue }) => {
  try {
    const response = await AxiosInstance.get<ApiEnvelope<RegistrarDashboardSummary>>(
      "/api/dashboard/registrar",
    );
    return response.data.data;
  } catch (error) {
    return rejectWithValue(errorPayload(error, "Could not load registrar dashboard"));
  }
});
