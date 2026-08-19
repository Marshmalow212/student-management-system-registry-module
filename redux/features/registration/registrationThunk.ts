import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosInstance } from "@/lib/axios-client";
import { errorPayload, type ApiEnvelope, type ApiErrorPayload } from "../api";
type FeatureThunkConfig = { rejectValue: ApiErrorPayload };

export interface RegistrationInput {
  fullName: string;
  /**email: string;*/ dateOfBirth?: string | null;
  programmeId: number;
}
export type Registration = Record<string, unknown> & {
  student: Record<string, unknown>;
  enrollment: Record<string, unknown>;
};

export const registerStudent = createAsyncThunk<
  Registration,
  RegistrationInput,
  FeatureThunkConfig
>("registration/create", async (data, { rejectWithValue }) => {
  try {
    return (
      await AxiosInstance.post<ApiEnvelope<Registration>>(
        "/api/student-registrations",
        data,
      )
    ).data.data;
  } catch (error) {
    return rejectWithValue(errorPayload(error, "Could not register student"));
  }
});
