"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import type { Payment } from "@/types/payment";
import {
  PaymentHistoryDataTable,
  type PaymentHistoryRow,
} from "@/components/feature/tables/payment-history-data-table";

type PaymentHistoryProps = {
  payments: Payment[];
  mode: "staff" | "student";
  onViewDetails?: (payment: Payment) => void | Promise<void>;
  selectedPayment?: Payment | null;
  detailLoading?: boolean;
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount: string, currency: string = "USD") {
  return `${currency} ${amount}`;
}

export function PaymentHistory({
  payments,
  mode,
  onViewDetails,
  selectedPayment,
  detailLoading,
}: PaymentHistoryProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const isStaff = mode === "staff";
  async function handleViewDetails(payment: Payment) {
    setDialogOpen(true);
    if (onViewDetails) {
      await onViewDetails(payment);
    }
  }

  return (
    <>
      <Card className="flex flex-col gap-6 overflow-auto h-full">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            {isStaff
              ? "All payment transactions recorded in the system"
              : "Your payment history for enrolled programmes"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payments found
            </p>
          ) : (
            <PaymentHistoryDataTable
              data={payments as PaymentHistoryRow[]}
              isLoading={false}
              isStaff={isStaff}
              onViewDetails={handleViewDetails}
            />
          )}
        </CardContent>
      </Card>

      {isStaff && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
              <DialogDescription>
                Complete payment transaction information
              </DialogDescription>
            </DialogHeader>
            {detailLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : selectedPayment ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Payment Reference
                    </p>
                    <p className="text-base font-semibold">
                      {selectedPayment.reference}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Amount
                    </p>
                    <p className="text-base font-semibold">
                      {formatMoney(
                        selectedPayment.amount,
                        selectedPayment.currency,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Payment Date
                    </p>
                    <p className="text-base">
                      {formatDateTime(selectedPayment.paymentDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Created At
                    </p>
                    <p className="text-base">
                      {formatDateTime(selectedPayment.createdAt)}
                    </p>
                  </div>
                </div>

                {selectedPayment.enrollment && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 font-semibold">
                      Enrollment Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Enrollment Reference
                        </p>
                        <p className="text-sm">
                          {selectedPayment.enrollment.reference}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Student
                        </p>
                        <p className="text-sm">
                          {selectedPayment.enrollment.student.fullName}
                          <br />
                          <code className="text-xs text-muted-foreground">
                            {selectedPayment.enrollment.student.studentUid}
                          </code>
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Programme
                        </p>
                        <p className="text-sm">
                          {selectedPayment.enrollment.programme.name}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedPayment.receivedBy && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 font-semibold">Received By</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Staff Name
                        </p>
                        <p className="text-sm">
                          {selectedPayment.receivedBy.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Email
                        </p>
                        <p className="text-sm">
                          {selectedPayment.receivedBy.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
