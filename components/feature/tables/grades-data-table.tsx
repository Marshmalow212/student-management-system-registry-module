"use client";

import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  type DataTableColumnDef,
} from "@/components/feature/tables/data-table";

export type GradeRow = {
  id: number;
  assessmentId: number;
  assessmentTitle: string;
  subjectName: string | null;
  studentId: number;
  studentUid: string;
  studentName: string;
  programmeId: number;
  programmeName: string;
  marks: string;
  maxMarks: string;
  percentage: string;
  classification: string;
  isPublished: boolean;
  hasOverdueBalance: boolean;
  gradedAt: string;
  publishedAt: string | null;
};

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

export function getGradeColumns({
  staff,
}: {
  staff: boolean;
}): DataTableColumnDef<GradeRow>[] {
  return [
    {
      id: "primary",
      header: staff ? "Student" : "Assessment",
      cell: ({ row }) =>
        staff
          ? `${row.original.studentName} (${row.original.studentUid})`
          : row.original.assessmentTitle,
    },
    {
      id: "secondary",
      header: staff ? "Assessment" : "Subject",
      cell: ({ row }) =>
        staff
          ? row.original.assessmentTitle
          : row.original.subjectName || "-",
    },
    {
      id: "marks",
      header: "Marks",
      cell: ({ row }) => `${row.original.marks} / ${row.original.maxMarks}`,
    },
    {
      accessorKey: "percentage",
      header: "Percentage",
      cell: ({ row }) => `${row.original.percentage}%`,
    },
    {
      accessorKey: "classification",
      header: "Grade",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.classification === "Fail" ? "destructive" : "secondary"
          }
        >
          {row.original.classification}
        </Badge>
      ),
    },
    {
      accessorKey: "publishedAt",
      header: "Published",
      cell: ({ row }) => dateLabel(row.original.publishedAt),
    },
  ];
}

export function GradesDataTable({
  data,
  isLoading,
  staff,
  hasOverdueBalance,
}: {
  data: GradeRow[];
  isLoading?: boolean;
  staff: boolean;
  hasOverdueBalance?: boolean;
}) {
  const overdue = hasOverdueBalance ?? data.some((row) => row.hasOverdueBalance);
  return (
    <DataTable
      data={data}
      columns={getGradeColumns({ staff })}
      isLoading={isLoading}
      emptyMessage={
        overdue
          ? "Overdue payment: published results are unavailable until the outstanding balance is cleared."
          : "No published results match these filters."
      }
      initialPageSize={20}
    />
  );
}
