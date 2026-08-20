"use client";

import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  type DataTableColumnDef,
} from "@/components/feature/tables/data-table";

export type AccountRow = {
  id: number;
  name: string;
  email: string;
  role: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
};

const roleLabels: Record<number, string> = {
  0: "Student",
  1: "Staff",
  2: "Registrar",
  3: "Admin",
};

function roleLabel(role: number) {
  return roleLabels[role] ?? "Unknown";
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString();
}

export function getAccountColumns(): DataTableColumnDef<AccountRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline">{roleLabel(row.original.role)}</Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "isVerified",
      header: "Verified",
      cell: ({ row }) => (row.original.isVerified ? "Yes" : "No"),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => dateLabel(row.original.createdAt),
    },
  ];
}

export function AccountsDataTable({
  data,
  isLoading,
}: {
  data: AccountRow[];
  isLoading?: boolean;
}) {
  return (
    <DataTable
      data={data}
      columns={getAccountColumns()}
      isLoading={isLoading}
      emptyMessage="No users found for this role."
      initialPageSize={10}
    />
  );
}
