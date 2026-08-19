import registryReducer from "./registry/registrySlice";
import { fetchRegistry, saveRegistryItem } from "./registry/registryThunk";
import paymentReducer from "./payment/paymentSlice";
import { createPayment, fetchBalance, fetchPayments } from "./payment/paymentThunk";
import assessmentReducer from "./assessment/assessmentSlice";
import { fetchAssessments, saveAssessment } from "./assessment/assessmentThunk";
import {
  assessmentStatus,
  assessmentStatusMap,
  normalizeAssessmentStatus,
} from "@/lib/assessments";

const error = { error: "Forbidden", code: "FORBIDDEN" };

describe("feature state", () => {
  it("tracks registry request, result, and rejection", () => {
    let state = registryReducer(undefined, fetchRegistry.pending("id", { kind: "programmes" }));
    expect(state.isLoading).toBe(true);
    state = registryReducer(state, fetchRegistry.fulfilled({ items: [{ id: 1, status: "ACTIVE", fee: "10.00" }], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }, "id", { kind: "programmes" }));
    expect(state.programmes.items[0].fee).toBe("10.00");
    state = registryReducer(state, saveRegistryItem.rejected(null, "id", { kind: "programmes", data: {} }, error));
    expect(state.errorCode).toBe("FORBIDDEN");
  });

  it("keeps money strings and reload state after payment mutation", () => {
    let state = paymentReducer(undefined, fetchPayments.fulfilled([{ id: 1, enrollmentId: 2, amount: "12.50" }], "id", { enrollmentId: 2 }));
    state = paymentReducer(state, fetchBalance.fulfilled({ enrollmentId: 2, feeTotal: "50.00", paid: "12.50", balance: "37.50", overdue: false }, "id", 2));
    state = paymentReducer(state, createPayment.pending("id", { enrollmentId: 2, reference: "P-1", idempotencyKey: "key", amount: "12.50", currency: "USD" }));
    state = paymentReducer(state, createPayment.fulfilled({ id: 2, enrollmentId: 2, amount: "12.50" }, "id", { enrollmentId: 2, reference: "P-1", idempotencyKey: "key", amount: "12.50", currency: "USD" }));
    expect(state.balance?.balance).toBe("37.50");
    expect(state.detail?.amount).toBe("12.50");
    expect(state.isSaving).toBe(false);
  });

  it("clears stale errors and reloads assessment list after mutation", () => {
    let state = assessmentReducer(undefined, fetchAssessments.rejected(null, "id", undefined, error));
    expect(state.errorCode).toBe("FORBIDDEN");
    state = assessmentReducer(state, saveAssessment.pending("id", { data: {} }));
    expect(state.error).toBeNull();
    state = assessmentReducer(state, fetchAssessments.fulfilled([{ id: 1, maxMarks: "100.00", status: "PUBLISHED" }], "id", undefined));
    expect(state.items[0].maxMarks).toBe("100.00");
  });

  it("supports the new assessment lifecycle and numeric status mapping", () => {
    expect(assessmentStatus).toEqual(["DRAFT", "OPEN", "CLOSED", "RESULT"]);
    expect(assessmentStatusMap[0]).toBe("DRAFT");
    expect(assessmentStatusMap[1]).toBe("OPEN");
    expect(assessmentStatusMap[2]).toBe("CLOSED");
    expect(assessmentStatusMap[3]).toBe("RESULT");
    expect(normalizeAssessmentStatus("OPEN")).toBe(1);
    expect(normalizeAssessmentStatus(2)).toBe(2);
    expect(normalizeAssessmentStatus("RESULT")).toBe(3);
  });
});
