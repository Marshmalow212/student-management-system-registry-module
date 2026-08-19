import { createSlice } from "@reduxjs/toolkit";
import {
  clearRequestError,
  idleRequestState,
  setRequestError,
  type RequestState,
} from "../api";
import {
  createPayment,
  fetchBalance,
  fetchEnrollments,
  fetchPaymentDetail,
  fetchPayments,
  type Balance,
  type Enrollment,
  type Payment,
} from "./paymentThunk";
interface PaymentState extends RequestState {
  payments: Payment[];
  detail: Payment | null;
  balance: Balance | null;
  enrollments: Enrollment[];
}
const initialState: PaymentState = {
  ...idleRequestState,
  payments: [],
  detail: null,
  balance: null,
  enrollments: [],
};
const pending = (state: PaymentState) => {
  state.isLoading = true;
  clearRequestError(state);
};
const rejected = (
  state: PaymentState,
  action: { payload?: import("../api").ApiErrorPayload },
) => {
  state.isLoading = false;
  setRequestError(state, action.payload);
};
export const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    clearPaymentError: clearRequestError,
    clearPaymentDetail: (state) => {
      state.detail = null;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(fetchPayments.pending, pending)
      .addCase(fetchPayments.fulfilled, (s, a) => {
        s.payments = a.payload;
        s.isLoading = false;
      })
      .addCase(fetchPayments.rejected, rejected)
      .addCase(fetchPaymentDetail.pending, pending)
      .addCase(fetchPaymentDetail.fulfilled, (s, a) => {
        s.detail = a.payload;
        s.isLoading = false;
      })
      .addCase(fetchPaymentDetail.rejected, rejected)
      .addCase(fetchBalance.pending, pending)
      .addCase(fetchBalance.fulfilled, (s, a) => {
        s.balance = a.payload;
        s.isLoading = false;
      })
      .addCase(fetchBalance.rejected, rejected)
      .addCase(fetchEnrollments.pending, pending)
      .addCase(fetchEnrollments.fulfilled, (s, a) => {
        s.enrollments = a.payload;
        s.isLoading = false;
      })
      .addCase(fetchEnrollments.rejected, rejected)
      .addCase(createPayment.pending, (s) => {
        s.isSaving = true;
        clearRequestError(s);
      })
      .addCase(createPayment.fulfilled, (s, a) => {
        s.detail = a.payload;
        s.isSaving = false;
      })
      .addCase(createPayment.rejected, (s, a) => {
        s.isSaving = false;
        setRequestError(s, a.payload);
      }),
});
export const { clearPaymentError, clearPaymentDetail } = paymentSlice.actions;
export default paymentSlice.reducer;
