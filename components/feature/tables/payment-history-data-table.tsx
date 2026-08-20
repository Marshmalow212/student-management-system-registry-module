"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumnDef,
} from "@/components/feature/tables/data-table";
import type { Payment } from "@/types/payment";

export type PaymentHistoryRow = Payment;

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(amount: string, currency = "USD") {
  return `${currency} ${amount}`;
}

export function getPaymentHistoryColumns({
  isStaff,
  onViewDetails,
}: {
  isStaff: boolean;
  onViewDetails: (row: PaymentHistoryRow) => void;
}): DataTableColumnDef<PaymentHistoryRow>[] {
  const baseColumns: DataTableColumnDef<PaymentHistoryRow>[] = [
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.reference}</span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {formatMoney(row.original.amount, row.original.currency)}
        </Badge>
      ),
    },
    {
      accessorKey: "paymentDate",
      header: "Payment Date",
      cell: ({ row }) => formatDate(row.original.paymentDate),
    },
  ];

  if (isStaff) {
    baseColumns.push(
      {
        id: "student",
        header: "Student",
        cell: ({ row }) =>
          row.original.enrollment?.student?.fullName || "-",
      },
      {
        id: "programme",
        header: "Programme",
        cell: ({ row }) =>
          row.original.enrollment?.programme?.name || "-",
      },
    );
  }

  baseColumns.push({
    accessorKey: "enrollmentId",
    header: "Enrollment ID",
    cell: ({ row }) => (
      <code className="text-xs">{row.original.enrollmentId}</code>
    ),
  });

  if (isStaff) {
    baseColumns.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(row.original)}
        >
          View Details
        </Button>
      ),
    });
  }

  return baseColumns;
}

export function PaymentHistoryDataTable({
  data,
  isLoading,
  isStaff,
  onViewDetails,
}: {
  data: PaymentHistoryRow[];
  isLoading?: boolean;
  isStaff: boolean;
  onViewDetails: (row: PaymentHistoryRow) => void;
}) {
  return (
    <DataTable
      data={data}
      columns={getPaymentHistoryColumns({ isStaff, onViewDetails })}
      isLoading={isLoading}
      emptyMessage="No payments found"
      initialPageSize={10}
    />
  );
}
