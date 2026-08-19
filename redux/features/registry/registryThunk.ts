import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosInstance } from "@/lib/axios-client";
import { errorPayload, type ApiEnvelope, type ApiErrorPayload, type Pagination } from "../api";
type FeatureThunkConfig = { rejectValue: ApiErrorPayload };

export type RegistryKind = "students" | "programmes";
export type RegistryItem = Record<string, unknown> & { id: number; status: string };
export type RegistryList = { items: RegistryItem[]; pagination?: Pagination };
export type RegistryQuery = { kind: RegistryKind; params?: Record<string, string | number | undefined> };

const endpoint = (kind: RegistryKind) => `/api/${kind}`;
const reject = (error: unknown, fallback: string) => errorPayload(error, fallback);

export const fetchRegistry = createAsyncThunk<RegistryList, RegistryQuery, FeatureThunkConfig>(
  "registry/fetch",
  async ({ kind, params }, { rejectWithValue }) => {
    try {
      const response = await AxiosInstance.get<ApiEnvelope<RegistryItem[]>>(endpoint(kind), { params });
      return { items: response.data.data, pagination: response.data.pagination };
    } catch (error) { return rejectWithValue(reject(error, "Could not load registry records")); }
  },
);

export const fetchRegistryDetail = createAsyncThunk<RegistryItem, { kind: RegistryKind; id: number }, FeatureThunkConfig>(
  "registry/fetchDetail",
  async ({ kind, id }, { rejectWithValue }) => {
    try { return (await AxiosInstance.get<ApiEnvelope<RegistryItem>>(`${endpoint(kind)}/${id}`)).data.data; }
    catch (error) { return rejectWithValue(reject(error, "Could not load registry record")); }
  },
);

export const saveRegistryItem = createAsyncThunk<RegistryItem, { kind: RegistryKind; id?: number; data: Record<string, unknown>; reload?: RegistryQuery }, FeatureThunkConfig>(
  "registry/save",
  async ({ kind, id, data, reload }, { dispatch, rejectWithValue }) => {
    try {
      const response = id
        ? await AxiosInstance.patch<ApiEnvelope<RegistryItem>>(`${endpoint(kind)}/${id}`, data)
        : await AxiosInstance.post<ApiEnvelope<RegistryItem>>(endpoint(kind), data);
      if (reload) await dispatch(fetchRegistry(reload)).unwrap();
      return response.data.data;
    } catch (error) { return rejectWithValue(reject(error, "Could not save registry record")); }
  },
);

export const deleteRegistryItem = createAsyncThunk<RegistryItem, { kind: RegistryKind; id: number; reload?: RegistryQuery }, FeatureThunkConfig>(
  "registry/delete",
  async ({ kind, id, reload }, { dispatch, rejectWithValue }) => {
    try {
      const response = await AxiosInstance.delete<ApiEnvelope<RegistryItem>>(`${endpoint(kind)}/${id}`);
      if (reload) await dispatch(fetchRegistry(reload)).unwrap();
      return response.data.data;
    } catch (error) { return rejectWithValue(reject(error, "Could not archive registry record")); }
  },
);
