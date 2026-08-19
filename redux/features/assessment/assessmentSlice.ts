import { createSlice } from "@reduxjs/toolkit";
import {
  clearRequestError,
  idleRequestState,
  setRequestError,
  type RequestState,
} from "../api";
import {
  fetchAssessmentDetail,
  fetchAssessments,
  fetchAssessmentStatus,
  gradeAssessment,
  publishAssessmentResults,
  publishResult,
  saveAssessment,
  submitAssessment,
  uploadAssessmentFile,
  type Assessment,
  type Result,
  type Submission,
} from "./assessmentThunk";
interface AssessmentState extends RequestState {
  items: Assessment[];
  detail: Assessment | null;
  submissions: Submission[];
  results: Result[];
  uploadedFilePath?: string|null;
  uploadedFileName?: string|null;
}
const initialState: AssessmentState = {
  ...idleRequestState,
  items: [],
  detail: null,
  submissions: [],
  results: [],
  uploadedFilePath: null,
  uploadedFileName: null,
};
const loading = (state: AssessmentState) => {
  state.isLoading = true;
  clearRequestError(state);
};
const failed = (
  state: AssessmentState,
  action: { payload?: import("../api").ApiErrorPayload },
) => {
  state.isLoading = false;
  setRequestError(state, action.payload);
};
const savePending = (state: AssessmentState) => {
  state.isSaving = true;
  clearRequestError(state);
};
const saveFailed = (
  state: AssessmentState,
  action: { payload?: import("../api").ApiErrorPayload },
) => {
  state.isSaving = false;
  setRequestError(state, action.payload);
};
export const assessmentSlice = createSlice({
  name: "assessment",
  initialState,
  reducers: {
    clearAssessmentError: clearRequestError,
    clearAssessmentDetail: (state) => {
      state.detail = null;
    },
    clearUploadedFile: (state) => {
      state.uploadedFilePath = null;
      state.uploadedFileName = null;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(fetchAssessments.pending, loading)
      .addCase(fetchAssessments.fulfilled, (s, a) => {
        s.items = a.payload;
        s.isLoading = false;
      })
      .addCase(fetchAssessments.rejected, failed)
      .addCase(fetchAssessmentDetail.pending, loading)
      .addCase(fetchAssessmentDetail.fulfilled, (s, a) => {
        s.detail = a.payload;
        s.isLoading = false;
      })
      .addCase(fetchAssessmentDetail.rejected, failed)
      .addCase(fetchAssessmentStatus.pending, loading)
      .addCase(fetchAssessmentStatus.fulfilled, (s, a) => {
        s.submissions = a.payload.submissions;
        s.results = a.payload.results;
        s.isLoading = false;
      })
      .addCase(fetchAssessmentStatus.rejected, failed)
      .addCase(saveAssessment.pending, savePending)
      .addCase(saveAssessment.fulfilled, (s, a) => {
        s.detail = a.payload;
        s.isSaving = false;
      })
      .addCase(saveAssessment.rejected, saveFailed)
      .addCase(submitAssessment.pending, savePending)
      .addCase(submitAssessment.fulfilled, (s) => {
        s.isSaving = false;
      })
      .addCase(submitAssessment.rejected, saveFailed)
      .addCase(gradeAssessment.pending, savePending)
      .addCase(gradeAssessment.fulfilled, (s) => {
        s.isSaving = false;
      })
      .addCase(gradeAssessment.rejected, saveFailed)
      .addCase(publishResult.pending, savePending)
      .addCase(publishResult.fulfilled, (s) => {
        s.isSaving = false;
      })
      .addCase(publishResult.rejected, saveFailed)
      .addCase(publishAssessmentResults.pending, savePending)
      .addCase(publishAssessmentResults.fulfilled, (s) => {
        s.isSaving = false;
      })
      .addCase(publishAssessmentResults.rejected, saveFailed)
      .addCase(uploadAssessmentFile.fulfilled, (s, a) => {
        s.uploadedFilePath = a.payload.file_path;
        s.uploadedFileName = a.payload.fileName;
      })
});
export const { clearAssessmentError, clearAssessmentDetail, clearUploadedFile } =
  assessmentSlice.actions;
export default assessmentSlice.reducer;
