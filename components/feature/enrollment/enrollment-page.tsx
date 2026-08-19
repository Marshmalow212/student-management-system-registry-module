"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { AxiosInstance } from "@/lib/axios-client";
import { useAppDispatch } from "@/redux/hooks";
import {
  updateEnrollmentStatus,
  updateEnrolledFee,
  type EnrollmentStatus,
} from "@/redux/features/enrollment/enrollmentThunk";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EnrollmentForm,
  PaymentForm,
  type EnrollmentFormValues,
  type PaymentFormValues,
} from "@/components/forms/enrollment-forms";

type Enrollment = {
  id: number;
  reference: string;
  studentId: number;
  programmeId: number;
  enrolledYear: number;
  status: EnrollmentStatus;
  feeTotal: string;
  dueDate: string | null;
  student: { id: number; studentUid: string; fullName: string; email: string };
  programme: { id: number; name: string };
  balance: { paid: string; balance: string; overdue: boolean };
};
type Payment = {
  id: number;
  reference: string;
  idempotencyKey: string;
  enrollmentId: number;
  amount: string;
  currency: string;
  paymentDate: string;
  createdAt: string;
};
type ApiError = { error?: string; code?: string };

function errorMessage(reason: unknown) {
  const response = reason instanceof AxiosError ? reason.response : undefined;
  const body = response?.data as ApiError | undefined;
  const messages: Record<string, string> = {
    UNAUTHORIZED: "Your session has expired. Please sign in again.",
    FORBIDDEN: "You do not have permission to perform this action.",
    VALIDATION_ERROR: body?.error ?? "Check the submitted fields.",
    STUDENT_NOT_FOUND: "The student was not found or is withdrawn.",
    PROGRAMME_NOT_FOUND: "The programme was not found or is inactive.",
    ENROLLMENT_EXISTS:
      "This Enrollment reference or Student ID, Programme, and Enrollment Year combination already exists.",
    PAYMENT_EXISTS: "That payment reference already exists.",
    IDEMPOTENCY_CONFLICT:
      "This staff-only Payment Request Key belongs to different payment data. Use the original data or a new key.",
    OVERPAYMENT: "The payment exceeds the current outstanding balance.",
    ENROLLMENT_NOT_PAYABLE:
      "Completed and cancelled enrolments cannot receive payments.",
    ENROLLMENT_HAS_PAYMENTS: "An enrolment with payments cannot be cancelled.",
    INVALID_STATUS_TRANSITION:
      body?.error ?? "That lifecycle transition is not allowed.",
    ENROLLMENT_NOT_FOUND: "The enrolment no longer exists.",
    INTERNAL_ERROR: "The financial service is unavailable. Try again.",
  };
  return (
    (body?.code && messages[body.code]) ||
    body?.error ||
    "The financial service is unavailable. Try again."
  );
}

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "No due date";
}
function money(value: string) {
  return value;
}
const statusOptions: Array<{ value: EnrollmentStatus; label: string }> = [
  { value: 0, label: "Withdrawn" },
  { value: 1, label: "Enrolled" },
  { value: 2, label: "Completed" },
  { value: 3, label: "Deferred" },
];

const STATUS_SELECT_LABELS: Array<{ value: string; label: string }> = [
  { value: "0", label: "Withdrawn" },
  { value: "1", label: "Enrolled" },
  { value: "2", label: "Completed" },
  { value: "3", label: "Deferred" },
];
function statusLabel(value: EnrollmentStatus) {
  return statusOptions.find((option) => option.value === value)?.label ?? "Unknown";
}

export function EnrollmentPage({ role }: { role: number }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [items, setItems] = useState<Enrollment[]>([]);
  const [selected, setSelected] = useState<Enrollment | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDialogEnrollment, setPaymentDialogEnrollment] = useState<Enrollment | null>(null);
  const canWrite = role >= 2;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await AxiosInstance.get("/api/enrollments", {
        params: { status: status === "ALL" ? undefined : Number(status) },
      });
      setItems(response.data.data);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [
        item.reference,
        item.student.fullName,
        item.student.studentUid,
        item.programme.name,
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [items, search]);

  async function loadDetail(item: Enrollment) {
    setSelected(item);
    setDetailLoading(true);
    setError(null);
    try {
      const [enrollmentResponse, paymentResponse] = await Promise.all([
        AxiosInstance.get(`/api/enrollments/${item.id}`),
        AxiosInstance.get("/api/payments", {
          params: { enrollmentId: item.id },
        }),
      ]);
      setSelected(enrollmentResponse.data.data);
      setPayments(paymentResponse.data.data);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setDetailLoading(false);
    }
  }

  async function createEnrollment(values: EnrollmentFormValues) {
    setSaving(true);
    setError(null);
    try {
      const response = await AxiosInstance.post("/api/enrollments", {
        ...values,
        studentId: Number(values.studentId),
        programmeId: Number(values.programmeId),
        enrolledYear: Number(values.enrolledYear),
        dueDate: values.dueDate || undefined,
      });
      setShowEnrollmentForm(false);
      await loadDetail(response.data.data);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(nextStatus: EnrollmentStatus) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await dispatch(
        updateEnrollmentStatus({ id: selected.id, status: nextStatus }),
      ).unwrap();
      setSelected(updated as Enrollment);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }
  
  async function updateFees() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setDetailLoading(true);
    try {
      const updated = await dispatch(
        updateEnrolledFee({id: selected.id}),
      ).unwrap();
      setSelected(updated as Enrollment);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
      setDetailLoading(false);
    }
  }

  async function recordPayment(values: PaymentFormValues) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await AxiosInstance.post("/api/payments", {
        ...values,
        enrollmentId: selected.id,
        paymentDate: values.paymentDate
          ? new Date(values.paymentDate).toISOString()
          : undefined,
      });
      setShowPaymentForm(false);
      await loadDetail(selected);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function recordPaymentForEnrollment(
    enrollment: Enrollment,
    values: PaymentFormValues,
  ) {
    setSaving(true);
    setError(null);
    try {
      await AxiosInstance.post("/api/payments", {
        ...values,
        enrollmentId: enrollment.id,
        paymentDate: values.paymentDate
          ? new Date(values.paymentDate).toISOString()
          : undefined,
      });
      setPaymentDialogOpen(false);
      setPaymentDialogEnrollment(null);
      await loadDetail(enrollment);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8 h-full">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Registrar workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Enrollment and payments
          </h1>
          <p className="text-muted-foreground">
            Track lifecycle, fee balances, overdue accounts, and payment
            records.
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              setError(null);
              setShowEnrollmentForm(true);
            }}
          >
            Create Enrollment
          </Button>
        )}
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <Dialog open={showEnrollmentForm} onOpenChange={setShowEnrollmentForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create enrolment</DialogTitle>
            <DialogDescription>
              Create a lifecycle record for an active student and programme.
            </DialogDescription>
          </DialogHeader>
          <EnrollmentForm
            onSubmit={createEnrollment}
            onCancel={() => setShowEnrollmentForm(false)}
            isLoading={saving}
            error={error}
          />
        </DialogContent>
      </Dialog>
      <Card className="flex flex-col gap-6 overflow-auto h-full">
        <CardHeader>
          <CardTitle>Enrollment ledger</CardTitle>
          <CardDescription>
            {visibleItems.length} matching record
            {visibleItems.length === 1 ? "" : "s"}
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label="Search Enrollments"
              placeholder="Search reference, student, or Programme"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-md"
            />
            <Select
              value={status}
              onValueChange={(value) => value && setStatus(value)}
            >
              <SelectTrigger
                aria-label="Filter Enrollment status"
                className="w-44"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((value) => (
                <Skeleton key={value} className="h-10 w-full" />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              No matching Enrollments.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Overdue Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    onClick={() => void loadDetail(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadDetail(item);
                    }}
                  >
                    <TableCell className="font-medium">
                      {item.reference}
                    </TableCell>
                    <TableCell>{item.student.fullName}</TableCell>
                    <TableCell>{item.programme.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === 1 ? "default" : "secondary"
                        }
                      >
                        {statusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {money(item.balance.balance)}
                      {item.balance.overdue && (
                        <Badge variant="destructive" className="ms-2">
                          Overdue
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{dateLabel(item.dueDate)}</TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void loadDetail(item)}
                        >
                          Details
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={item.status !== 1 || saving}
                          onClick={() => {
                            setPaymentDialogEnrollment(item);
                            setPaymentDialogOpen(true);
                          }}
                        >
                          Add Payment
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            router.push(`/dashboard/payments?enrollmentId=${item.id}`);
                          }}
                        >
                          Payment History
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (!open) {
            setPaymentDialogEnrollment(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add payment</DialogTitle>
            <DialogDescription>
              Record a payment for the selected enrolment.
            </DialogDescription>
          </DialogHeader>
          {paymentDialogEnrollment && (
            <PaymentForm
              balance={paymentDialogEnrollment.balance.balance}
              enrollmentId={paymentDialogEnrollment.id}
              reference={paymentDialogEnrollment.reference}
              onSubmit={(values) =>
                recordPaymentForEnrollment(paymentDialogEnrollment, values)
              }
              onCancel={() => {
                setPaymentDialogOpen(false);
                setPaymentDialogEnrollment(null);
              }}
              isLoading={saving}
              error={error}
            />
          )}
        </DialogContent>
      </Dialog>
      {selected && (
        <Dialog
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) {
              setSelected(null);
              setPayments([]);
              setShowPaymentForm(false);
            }
          }}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Enrollment details</DialogTitle>
              <DialogDescription>
                Enrollment, balance, and payment information.
              </DialogDescription>
            </DialogHeader>
        <Card className="flex flex-col gap-6 overflow-auto h-full">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{selected.reference}</CardTitle>
                <CardDescription>
                  {selected.student.fullName} · {selected.programme.name}
                </CardDescription>
              </div>
              <Badge
                variant={selected.balance.overdue ? "destructive" : "outline"}
              >
                {selected.balance.overdue
                  ? "Overdue"
                  : statusLabel(selected.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 h-full">
            {detailLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <dl className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Total Fee</dt>
                    <dd className="text-lg font-medium">
                      {money(selected.feeTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Paid</dt>
                    <dd className="text-lg font-medium">
                      {money(selected.balance.paid)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Overdue Balance
                    </dt>
                    <dd className="text-lg font-medium">
                      {money(selected.balance.balance)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Due Date</dt>
                    <dd className="text-lg font-medium">
                      {dateLabel(selected.dueDate)}
                    </dd>
                  </div>
                </dl>
                {canWrite && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                    items = {STATUS_SELECT_LABELS}
                      aria-label="Enrollment status"
                      value={String(selected.status)}
                      onValueChange={(value) => {
                        const next = Number(value) as EnrollmentStatus;
                        if (next !== selected.status) void changeStatus(next);
                      }}
                    >
                      <SelectTrigger aria-label="Enrollment status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={saving || selected.status !== 1}
                      onClick={() => updateFees()}
                    >
                      Update Fees
                    </Button>
                  </div>
                )}
                {showPaymentForm && selected.status === 1 && (
                  <PaymentForm
                    balance={selected.balance.balance}
                    onSubmit={recordPayment}
                    onCancel={() => setShowPaymentForm(false)}
                    isLoading={saving}
                    error={error}
                  />
                )}
                <div className="flex flex-col gap-3 h-full">
                  <h3 className="mb-3 font-medium">Payment history</h3>
                  {payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No payments recorded.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Payment Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{payment.reference}</TableCell>
                            <TableCell>{payment.amount}</TableCell>
                            <TableCell>{payment.currency}</TableCell>
                            <TableCell>
                              {new Date(payment.paymentDate).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelected(null);
                  setPayments([]);
                  setShowPaymentForm(false);
                }}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
