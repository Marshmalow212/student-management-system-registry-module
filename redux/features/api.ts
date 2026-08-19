import axios from "axios";

export interface ApiErrorPayload {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface ApiEnvelope<T> {
  data: T;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RequestState {
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  errorCode: string | null;
}

export const idleRequestState: RequestState = {
  isLoading: false,
  isSaving: false,
  error: null,
  errorCode: null,
};

export function errorPayload(error: unknown, fallback: string): ApiErrorPayload {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as Partial<ApiErrorPayload>;
    return { error: data.error || fallback, code: data.code, details: data.details };
  }
  return { error: fallback };
}

export function clearRequestError(state: RequestState) {
  state.error = null;
  state.errorCode = null;
}

export function setRequestError(state: RequestState, payload?: ApiErrorPayload) {
  state.error = payload?.error ?? "An unknown error occurred";
  state.errorCode = payload?.code ?? null;
}
