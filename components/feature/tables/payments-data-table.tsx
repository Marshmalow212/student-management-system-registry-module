"use client";

import {
  DataTable,
  type DataTableColumnDef,
} from "@/components/feature/tables/data-table";

export type PaymentRow = {
  id: number;
  reference: string;
  amount: string;
  currency: string;
  paymentDate: string;
};

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString();
}

export function getPaymentColumns(): DataTableColumnDef<PaymentRow>[] {
  return [
    {
      accessorKey: "reference",
      header: "Reference",
    },
    {
      accessorKey: "amount",
      header: "Amount",
    },
    {
      accessorKey: "currency",
      header: "Currency",
    },
    {
      accessorKey: "paymentDate",
      header: "Payment Date",
      cell: ({ row }) => formatDateTime(row.original.paymentDate),
    },
  ];
}

export function PaymentsDataTable({
  data,
  isLoading,
}: {
  data: PaymentRow[];
  isLoading?: boolean;
}) {
  return (
    <DataTable
      data={data}
      columns={getPaymentColumns()}
      isLoading={isLoading}
      emptyMessage="No payments recorded."
      initialPageSize={5}
      showColumnVisibility={false}
    />
  );
}
