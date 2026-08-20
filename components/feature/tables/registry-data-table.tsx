"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumnDef,
} from "@/components/feature/tables/data-table";
import { STUDENT_STATUS_LABEL } from "@/lib/student-status";

export type RegistryKind = "students" | "programmes";

export type RegistryRow = Record<string, unknown> & {
  id: number;
  status: string | number;
};

export type RegistryStudentRow = RegistryRow & {
  studentUid: string;
  fullName: string;
  email?: string;
  programme?: { name?: string } | null;
};

export type RegistryProgrammeRow = RegistryRow & {
  name: string;
  fee?: string | number;
  discount?: string | number;
};

function label(value: unknown) {
  return value == null || value === "" ? "-" : String(value);
}

function statusLabel(value: number | string) {
  if (typeof value === "string") {
    return value;
  }
  return STUDENT_STATUS_LABEL[
    value as keyof typeof STUDENT_STATUS_LABEL
  ] ?? String(value);
}

export function getRegistryColumns({
  kind,
  canDelete,
  onView,
  onArchive,
}: {
  kind: RegistryKind;
  canDelete: boolean;
  onView: (row: RegistryRow) => void;
  onArchive: (row: RegistryRow) => void;
}): DataTableColumnDef<RegistryRow>[] {
  const columns: DataTableColumnDef<RegistryRow>[] =
    kind === "students"
      ? [
          {
            id: "studentUid",
            header: "Student ID",
            cell: ({ row }) =>
              label((row.original as RegistryStudentRow).studentUid),
          },
          {
            id: "fullName",
            header: "Full Name",
            cell: ({ row }) =>
              label((row.original as RegistryStudentRow).fullName),
          },
          {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) =>
              label((row.original as RegistryStudentRow).email),
          },
          {
            id: "programme",
            header: "Programme",
            cell: ({ row }) =>
              label(
                (row.original as RegistryStudentRow).programme?.name,
              ),
          },
        ]
      : [
          {
            accessorKey: "name",
            header: "Programme",
            cell: ({ row }) =>
              label((row.original as RegistryProgrammeRow).name),
          },
          {
            id: "fee",
            header: "Total Fee",
            cell: ({ row }) =>
              label((row.original as RegistryProgrammeRow).fee),
          },
          {
            id: "discount",
            header: "Discount",
            cell: ({ row }) =>
              label((row.original as RegistryProgrammeRow).discount),
          },
        ];

  columns.push({
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="default">{statusLabel(row.original.status)}</Badge>
    ),
  });

  columns.push({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => onView(row.original)}>
          View
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive(row.original)}
          >
            Archive
          </Button>
        )}
      </div>
    ),
  });

  return columns;
}

export function RegistryDataTable({
  data,
  isLoading,
  kind,
  canDelete,
  onView,
  onArchive,
}: {
  data: RegistryRow[];
  isLoading?: boolean;
  kind: RegistryKind;
  canDelete: boolean;
  onView: (row: RegistryRow) => void;
  onArchive: (row: RegistryRow) => void;
}) {
  return (
    <DataTable
      data={data}
      columns={getRegistryColumns({ kind, canDelete, onView, onArchive })}
      isLoading={isLoading}
      emptyMessage="No students registered yet."
      initialPageSize={20}
      pageSizeOptions={[10, 20, 50, 100]}
    />
  );
}
