"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumnDef,
} from "@/components/feature/tables/data-table";

export type EnrollmentStatus = 0 | 1 | 2 | 3;

export type EnrollmentRow = {
  id: number;
  reference: string;
  student: { id: number; studentUid: string; fullName: string; email: string };
  programme: { id: number; name: string };
  status: EnrollmentStatus;
  feeTotal: string;
  dueDate: string | null;
  balance: { paid: string; balance: string; overdue: boolean };
};

const statusOptions: Array<{ value: EnrollmentStatus; label: string }> = [
  { value: 0, label: "Withdrawn" },
  { value: 1, label: "Enrolled" },
  { value: 2, label: "Completed" },
  { value: 3, label: "Deferred" },
];

function statusLabel(value: EnrollmentStatus) {
  return statusOptions.find((option) => option.value === value)?.label ??
    "Unknown";
}

function money(value: string) {
  return value;
}

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "No due date";
}

export function getEnrollmentColumns({
  saving,
  onDetails,
  onAddPayment,
  onPaymentHistory,
}: {
  saving?: boolean;
  onDetails: (row: EnrollmentRow) => void;
  onAddPayment: (row: EnrollmentRow) => void;
  onPaymentHistory: (row: EnrollmentRow) => void;
}): DataTableColumnDef<EnrollmentRow>[] {
  return [
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.reference}</span>
      ),
    },
    {
      id: "student",
      header: "Student",
      cell: ({ row }) => row.original.student.fullName,
    },
    {
      id: "programme",
      header: "Programme",
      cell: ({ row }) => row.original.programme.name,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === 1 ? "default" : "secondary"}>
          {statusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      id: "balance",
      header: "Overdue Balance",
      cell: ({ row }) => (
        <span>
          {money(row.original.balance.balance)}
          {row.original.balance.overdue && (
            <Badge variant="destructive" className="ms-2">
              Overdue
            </Badge>
          )}
        </span>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => dateLabel(row.original.dueDate),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div
          className="flex flex-wrap gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDetails(row.original)}
          >
            Details
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={row.original.status !== 1 || saving}
            onClick={() => onAddPayment(row.original)}
          >
            Add Payment
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onPaymentHistory(row.original)}
          >
            Payment History
          </Button>
        </div>
      ),
    },
  ];
}

export function EnrollmentsDataTable({
  data,
  isLoading,
  saving,
  onDetails,
  onAddPayment,
  onPaymentHistory,
}: {
  data: EnrollmentRow[];
  isLoading?: boolean;
  saving?: boolean;
  onDetails: (row: EnrollmentRow) => void;
  onAddPayment: (row: EnrollmentRow) => void;
  onPaymentHistory: (row: EnrollmentRow) => void;
}) {
  return (
    <DataTable
      data={data}
      columns={getEnrollmentColumns({
        saving,
        onDetails,
        onAddPayment,
        onPaymentHistory,
      })}
      isLoading={isLoading}
      emptyMessage="No matching Enrollments."
      initialPageSize={10}
      onRowClick={onDetails}
    />
  );
}
