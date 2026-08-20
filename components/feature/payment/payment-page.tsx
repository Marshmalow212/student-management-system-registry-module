"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PaymentForm,
  type PaymentFormValues,
} from "@/components/ui/forms/payment-form";
import { PaymentHistory } from "./payment-history";
import { BalanceWidget } from "./balance-widget";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { clearPaymentDetail } from "@/redux/features/payment/paymentSlice";
import { toast } from "@/components/ui/toast";
import {
  createPayment,
  fetchBalance,
  fetchEnrollments,
  fetchPaymentDetail,
  fetchPayments,
} from "@/redux/features/payment/paymentThunk";

function message(error?: string | null) {
  return error;
}
export function PaymentPage({ mode }: { mode: "staff" | "student" }) {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const { payments, balance, enrollments, detail, isLoading, isSaving, error } =
    useAppSelector((state) => state.payment);
  const [enrollmentId, setEnrollmentId] = useState<string>(
    searchParams.get("enrollmentId") ?? "",
  );
  const [formOpen, setFormOpen] = useState(false);
  const isStaff = mode === "staff";

  const ENROLLMENT_LIST = enrollments.map((item: { id: number; student?: { fullName?: string } | null; programme?: { name?: string } | null; reference?: string | null }) => ({
    label: `${item.student?.fullName ?? "Student"} · ${item.programme?.name ?? "Programme"} · ${item.reference ?? `Enrolment ${item.id}`}`,
    value: String(item.id),
  }));
  useEffect(() => {
    const queryEnrollmentId = searchParams.get("enrollmentId");
    if (queryEnrollmentId && queryEnrollmentId !== enrollmentId) {
      setEnrollmentId(queryEnrollmentId);
    }
  }, [enrollmentId, searchParams]);

  useEffect(() => {
    void dispatch(
      fetchPayments(
        enrollmentId ? { enrollmentId: Number(enrollmentId) } : undefined,
      ),
    );
    if (isStaff) void dispatch(fetchEnrollments({ status: "ACTIVE" }));
  }, [dispatch, enrollmentId, isStaff]);
  async function selectEnrollment(value: string | null) {
    if (!value) return;
    setEnrollmentId(value);
    await dispatch(fetchBalance(Number(value))).unwrap();
  }
  async function record(values: PaymentFormValues) {
    if (!balance) return;

    toast.promise(dispatch(
      createPayment({
        ...values,
        enrollmentId: balance.enrollmentId,
        paymentDate: values.paymentDate
          ? new Date(values.paymentDate).toISOString()
          : undefined,
      }),
    ),
    {
      "loading": "payment processing...",
      "success": "Payment transaction successful",
      "error": (err) => `Error recording payment: ${err}`,

    });
    setFormOpen(false);
  }
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8 h-full">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {isStaff ? "Staff workspace" : "Student workspace"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isStaff ? "Payment management" : "My payments"}
          </h1>
          <p className="text-muted-foreground">
            {isStaff
              ? "Select an authorized active enrolment before recording a payment."
              : "Your read-only payment history."}
          </p>
        </div>
        {isStaff && (
          <Button disabled={!enrollmentId || !balance} onClick={() => setFormOpen(true)}>
            Add Payment
          </Button>
        )}
      </header>
      {message(error) && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {message(error)}
        </p>
      )}
      {isStaff && (
        <Card className="flex flex-col gap-6 overflow-auto h-full">
          <CardHeader>
            <CardTitle>Student and programme</CardTitle>
            <CardDescription>
              Only active enrolments available to your account are listed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select items={ENROLLMENT_LIST} value={enrollmentId} onValueChange={selectEnrollment}>
              <SelectTrigger
                aria-label="Select authorized student enrolment"
                className="w-full"
              >
                <SelectValue placeholder="Select student enrolment" />
              </SelectTrigger>
              <SelectContent>
                {enrollments.map((item) => {
                  const enrollment = item as {
                    id: number;
                    reference?: string;
                    student?: { fullName?: string; studentUid?: string };
                    programme?: { name?: string };
                  };
                  return (
                    <SelectItem
                      key={enrollment.id}
                      value={String(enrollment.id)}
                    >
                      {enrollment.student?.fullName ?? "Student"} ·{" "}
                      {enrollment.programme?.name ?? "Programme"} ·{" "}
                      {enrollment.reference ?? `Enrolment ${enrollment.id}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}
      {balance && <BalanceWidget balance={balance} />}
      {isLoading ? (
        <Card className="flex flex-col gap-6 overflow-auto h-full">
          <CardContent className="flex flex-col gap-3 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : (
        <PaymentHistory
          payments={payments as never[]}
          mode={mode}
          onViewDetails={
            isStaff
              ? async (payment) => {
                  await dispatch(fetchPaymentDetail(payment.id)).unwrap();
                }
              : undefined
          }
          selectedPayment={detail as never}
          detailLoading={isLoading}
        />
      )}
      <Dialog open={formOpen} onOpenChange={(open) => setFormOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Reference and amount are recorded against the selected programme
              enrolment.
            </DialogDescription>
          </DialogHeader>
          {balance && (
            <PaymentForm
              balance={balance.balance}
              onSubmit={record}
              onCancel={() => setFormOpen(false)}
              isLoading={isSaving}
              error={message(error)}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
