"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumnDef,
} from "@/components/feature/tables/data-table";

export type AssessmentRow = {
  id: number;
  title: string;
  subjectName: string | null;
  programme?: { name: string };
  dueDate: string;
  maxMarks: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | "RESULT";
};

function dateLabel(value: string) {
  return new Date(value).toLocaleString();
}

function statusVariant(
  status: AssessmentRow["status"],
): "default" | "secondary" | "outline" {
  if (status === "OPEN") return "default";
  if (status === "CLOSED" || status === "RESULT") return "secondary";
  return "outline";
}

export function getAssessmentColumns({
  onDetails,
}: {
  onDetails: (row: AssessmentRow) => void;
}): DataTableColumnDef<AssessmentRow>[] {
  return [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "subjectName",
      header: "Subject",
      cell: ({ row }) => row.original.subjectName || "-",
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) => dateLabel(row.original.dueDate),
    },
    {
      accessorKey: "maxMarks",
      header: "Maximum",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "action",
      header: "Action",
      cell: ({ row }) => (
        <Button onClick={() => onDetails(row.original)}>Details</Button>
      ),
    },
  ];
}

export function AssessmentsDataTable({
  data,
  isLoading,
  onDetails,
}: {
  data: AssessmentRow[];
  isLoading?: boolean;
  onDetails: (row: AssessmentRow) => void;
}) {
  return (
    <DataTable
      data={data}
      columns={getAssessmentColumns({ onDetails })}
      isLoading={isLoading}
      emptyMessage="No assessments found."
      initialPageSize={10}
    />
  );
}
