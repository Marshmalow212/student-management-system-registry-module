import { createSlice } from "@reduxjs/toolkit";
import { clearRequestError, idleRequestState, setRequestError, type RequestState } from "../api";
import { registerStudent, type Registration } from "./registrationThunk";

interface RegistrationState extends RequestState { registration: Registration | null; }
const initialState: RegistrationState = { ...idleRequestState, registration: null };
export const registrationSlice = createSlice({
  name: "registration", initialState,
  reducers: { clearRegistration: (state) => { state.registration = null; clearRequestError(state); }, clearRegistrationError: clearRequestError },
  extraReducers: (builder) => builder
    .addCase(registerStudent.pending, (state) => { state.isSaving = true; clearRequestError(state); })
    .addCase(registerStudent.fulfilled, (state, action) => { state.registration = action.payload; state.isSaving = false; })
    .addCase(registerStudent.rejected, (state, action) => { state.isSaving = false; setRequestError(state, action.payload); }),
});
export const { clearRegistration, clearRegistrationError } = registrationSlice.actions;
export default registrationSlice.reducer;
