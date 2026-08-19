import { createAsyncThunk } from "@reduxjs/toolkit";
import { AxiosInstance } from "@/lib/axios-client";
import { errorPayload, type ApiEnvelope, type ApiErrorPayload } from "../api";
type FeatureThunkConfig = { rejectValue: ApiErrorPayload };

export type Payment = Record<string, unknown> & {
  id: number;
  enrollmentId: number;
  amount: string;
};
export type Balance = {
  enrollmentId: number;
  feeTotal: string;
  paid: string;
  balance: string;
  overdue: boolean;
};
export type Enrollment = Record<string, unknown> & {
  id: number;
  balance: Balance;
};
export type PaymentInput = {
  enrollmentId: number;
  reference: string;
  idempotencyKey: string;
  amount: string;
  currency: string;
  paymentDate?: string;
};
const failure = (error: unknown, fallback: string) =>
  errorPayload(error, fallback);

export const fetchPayments = createAsyncThunk<
  Payment[],
  { enrollmentId?: number } | undefined,
  FeatureThunkConfig
>("payment/fetchHistory", async (params, { rejectWithValue }) => {
  try {
    return (
      await AxiosInstance.get<ApiEnvelope<Payment[]>>("/api/payments", {
        params,
      })
    ).data.data;
  } catch (error) {
    return rejectWithValue(failure(error, "Could not load payments"));
  }
});
export const fetchPaymentDetail = createAsyncThunk<
  Payment,
  number,
  FeatureThunkConfig
>("payment/fetchDetail", async (id, { rejectWithValue }) => {
  try {
    return (
      await AxiosInstance.get<ApiEnvelope<Payment>>(`/api/payments/${id}`)
    ).data.data;
  } catch (error) {
    return rejectWithValue(failure(error, "Could not load payment"));
  }
});
export const fetchBalance = createAsyncThunk<
  Balance,
  number,
  FeatureThunkConfig
>("payment/fetchBalance", async (enrollmentId, { rejectWithValue }) => {
  try {
    return (
      await AxiosInstance.get<ApiEnvelope<Balance>>(`/api/fees/${enrollmentId}`)
    ).data.data;
  } catch (error) {
    return rejectWithValue(failure(error, "Could not load enrollment balance"));
  }
});
export const fetchEnrollments = createAsyncThunk<
  Enrollment[],
  { status?: string } | undefined,
  FeatureThunkConfig
>("payment/fetchEnrollments", async (params, { rejectWithValue }) => {
  try {
    return (
      await AxiosInstance.get<ApiEnvelope<Enrollment[]>>("/api/enrollments", {
        params,
      })
    ).data.data;
  } catch (error) {
    return rejectWithValue(failure(error, "Could not load enrollments"));
  }
});
export const createPayment = createAsyncThunk<
  Payment,
  PaymentInput,
  FeatureThunkConfig
>("payment/create", async (data, { dispatch, rejectWithValue }) => {
  try {
    const payment = (
      await AxiosInstance.post<ApiEnvelope<Payment>>("/api/payments", data)
    ).data.data;
    await Promise.all([
      dispatch(fetchPayments({ enrollmentId: data.enrollmentId })).unwrap(),
      dispatch(fetchBalance(data.enrollmentId)).unwrap(),
    ]);
    return payment;
  } catch (error) {
    return rejectWithValue(failure(error, "Could not record payment"));
  }
});
