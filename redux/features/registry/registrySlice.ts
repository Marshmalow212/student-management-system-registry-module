import { createSlice } from "@reduxjs/toolkit";
import { clearRequestError, idleRequestState, setRequestError, type Pagination, type RequestState } from "../api";
import { deleteRegistryItem, fetchRegistry, fetchRegistryDetail, saveRegistryItem, type RegistryItem, type RegistryKind } from "./registryThunk";

type RegistryCache = { items: RegistryItem[]; detail: RegistryItem | null; pagination: Pagination | null };
export interface RegistryState extends RequestState { students: RegistryCache; programmes: RegistryCache; }
const cache = (): RegistryCache => ({ items: [], detail: null, pagination: null });
const initialState: RegistryState = { ...idleRequestState, students: cache(), programmes: cache() };
const target = (state: RegistryState, kind: RegistryKind) => state[kind];

export const registrySlice = createSlice({
  name: "registry", initialState,
  reducers: { clearRegistryError: clearRequestError, clearRegistryDetail: (state, action: { payload: RegistryKind }) => { target(state, action.payload).detail = null; } },
  extraReducers: (builder) => builder
    .addCase(fetchRegistry.pending, (state) => { state.isLoading = true; clearRequestError(state); })
    .addCase(fetchRegistry.fulfilled, (state, action) => { const value = target(state, action.meta.arg.kind); value.items = action.payload.items; value.pagination = action.payload.pagination ?? null; state.isLoading = false; })
    .addCase(fetchRegistry.rejected, (state, action) => { state.isLoading = false; setRequestError(state, action.payload); })
    .addCase(fetchRegistryDetail.pending, (state) => { state.isLoading = true; clearRequestError(state); })
    .addCase(fetchRegistryDetail.fulfilled, (state, action) => { target(state, action.meta.arg.kind).detail = action.payload; state.isLoading = false; })
    .addCase(fetchRegistryDetail.rejected, (state, action) => { state.isLoading = false; setRequestError(state, action.payload); })
    .addCase(saveRegistryItem.pending, (state) => { state.isSaving = true; clearRequestError(state); })
    .addCase(saveRegistryItem.fulfilled, (state, action) => { target(state, action.meta.arg.kind).detail = action.payload; state.isSaving = false; })
    .addCase(saveRegistryItem.rejected, (state, action) => { state.isSaving = false; setRequestError(state, action.payload); })
    .addCase(deleteRegistryItem.pending, (state) => { state.isSaving = true; clearRequestError(state); })
    .addCase(deleteRegistryItem.fulfilled, (state, action) => { const value = target(state, action.meta.arg.kind); value.detail = value.detail?.id === action.payload.id ? null : value.detail; state.isSaving = false; })
    .addCase(deleteRegistryItem.rejected, (state, action) => { state.isSaving = false; setRequestError(state, action.payload); }),
});
export const { clearRegistryError, clearRegistryDetail } = registrySlice.actions;
export default registrySlice.reducer;
