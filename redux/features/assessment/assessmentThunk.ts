import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosInstance } from "@/lib/axios-client";
import { errorPayload, type ApiEnvelope, type ApiErrorPayload } from "../api";
type FeatureThunkConfig = { rejectValue: ApiErrorPayload };

export type Assessment = Record<string, unknown> & {
  id: number;
  maxMarks: string;
  status: string;
};
export type Submission = Record<string, unknown> & {
  id: number;
  assessmentId: number;
};
export type Result = Record<string, unknown> & {
  id: number;
  assessmentId: number;
  submissionId: number;
  marks: string;
};
export type SubmissionPayload = {
  student_id: number;
  programme_id: number;
  assessment_id: number;
  file_path: string;
};
export type UploadResponse = {
  file_path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};
const reject = (error: unknown, fallback: string) =>
  errorPayload(error, fallback);

export const fetchAssessments = createAsyncThunk<
  Assessment[],
  { status?: string } | undefined,
  FeatureThunkConfig
>("assessment/fetch", async (params, { rejectWithValue }) => {
  try {
    return (
      await AxiosInstance.get<ApiEnvelope<Assessment[]>>("/api/assessments", {
        params,
      })
    ).data.data;
  } catch (error) {
    return rejectWithValue(reject(error, "Could not load assessments"));
  }
});
export const fetchAssessmentDetail = createAsyncThunk<
  Assessment,
  number,
  FeatureThunkConfig
>("assessment/fetchDetail", async (id, { rejectWithValue }) => {
  try {
    return (
      await AxiosInstance.get<ApiEnvelope<Assessment>>(`/api/assessments/${id}`)
    ).data.data;
  } catch (error) {
    return rejectWithValue(reject(error, "Could not load assessment"));
  }
});
export const fetchAssessmentStatus = createAsyncThunk<
  { submissions: Submission[]; results: Result[] },
  void,
  FeatureThunkConfig
>("assessment/fetchStatus", async (_, { rejectWithValue }) => {
  try {
    const [submissions, results] = await Promise.all([
      AxiosInstance.get<ApiEnvelope<Submission[]>>("/api/submissions"),
      AxiosInstance.get<ApiEnvelope<Result[]>>("/api/results"),
    ]);
    return { submissions: submissions.data.data, results: results.data.data };
  } catch (error) {
    return rejectWithValue(reject(error, "Could not load assessment status"));
  }
});
export const saveAssessment = createAsyncThunk<
  Assessment,
  { id?: number; data: Record<string, unknown>; reload?: { status?: string } },
  FeatureThunkConfig
>(
  "assessment/save",
  async ({ id, data, reload }, { dispatch, rejectWithValue }) => {
    try {
      const response = id
        ? await AxiosInstance.patch<ApiEnvelope<Assessment>>(
            `/api/assessments/${id}`,
            data,
          )
        : await AxiosInstance.post<ApiEnvelope<Assessment>>(
            "/api/assessments",
            data,
          );
      await Promise.all([
        dispatch(fetchAssessments(reload)).unwrap(),
        dispatch(fetchAssessmentStatus()).unwrap(),
      ]);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(reject(error, "Could not save assessment"));
    }
  },
);
export const uploadAssessmentFile = createAsyncThunk<
  UploadResponse,
  File | undefined,
  FeatureThunkConfig
>("assessment/uploadFile", async (file, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    if (!file) {
      return rejectWithValue(reject("No file provided", "No file provided"));
    }
    formData.append("assessmentFile", file);
    return (
      await AxiosInstance.post<ApiEnvelope<UploadResponse>>(
        "/api/submissions/file-upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      )
    ).data.data;
  } catch (error) {
    return rejectWithValue(reject(error, "Could not upload assessment file"));
  }
});
export const submitAssessment = createAsyncThunk<
  Submission,
  SubmissionPayload,
  FeatureThunkConfig
>("assessment/submit", async (data, { dispatch, rejectWithValue }) => {
  try {
    const item = (
      await AxiosInstance.post<ApiEnvelope<Submission>>(
        "/api/submissions",
        data,
      )
    ).data.data;
    await dispatch(fetchAssessmentStatus()).unwrap();
    return item;
  } catch (error) {
    return rejectWithValue(reject(error, "Could not submit assessment"));
  }
});
export const resubmitAssessment = createAsyncThunk<
  Submission,
  SubmissionPayload,
  FeatureThunkConfig
>("assessment/resubmit", async (data, { dispatch, rejectWithValue }) => {
  try {
    const item = (
      await AxiosInstance.post<ApiEnvelope<Submission>>(
        "/api/submissions",
        data,
      )
    ).data.data;
    await dispatch(fetchAssessmentStatus()).unwrap();
    return item;
  } catch (error) {
    return rejectWithValue(reject(error, "Could not resubmit assessment"));
  }
});
export const gradeAssessment = createAsyncThunk<
  Result,
  Record<string, unknown>,
  FeatureThunkConfig
>("assessment/grade", async (data, { dispatch, rejectWithValue }) => {
  try {
    const item = (
      await AxiosInstance.post<ApiEnvelope<Result>>("/api/results", data)
    ).data.data;
    await dispatch(fetchAssessmentStatus()).unwrap();
    return item;
  } catch (error) {
    return rejectWithValue(reject(error, "Could not grade assessment"));
  }
});
export const publishResult = createAsyncThunk<
  Result,
  number,
  FeatureThunkConfig
>("assessment/publishResult", async (id, { dispatch, rejectWithValue }) => {
  try {
    const item = (
      await AxiosInstance.patch<ApiEnvelope<Result>>(`/api/results/${id}`, {})
    ).data.data;
    await dispatch(fetchAssessmentStatus()).unwrap();
    return item;
  } catch (error) {
    return rejectWithValue(reject(error, "Could not publish result"));
  }
});
export type BulkPublishOutcome = {
  assessmentId: number;
  outcomes: Array<{
    resultId: number;
    studentId: number;
    status: "PUBLISHED" | "ON_HOLD";
    balance?: string;
  }>;
  published: number;
  onHold: number;
};
export const publishAssessmentResults = createAsyncThunk<
  BulkPublishOutcome,
  { assessmentId: number; override?: boolean },
  FeatureThunkConfig
>("assessment/publishResults", async (data, { dispatch, rejectWithValue }) => {
  try {
    const item = (
      await AxiosInstance.post<ApiEnvelope<BulkPublishOutcome>>(
        "/api/results/publish",
        data,
      )
    ).data.data;
    await dispatch(fetchAssessmentStatus()).unwrap();
    return item;
  } catch (error) {
    return rejectWithValue(
      reject(error, "Could not publish assessment results"),
    );
  }
});
