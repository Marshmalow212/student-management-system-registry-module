"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumnDef,
} from "@/components/feature/tables/data-table";

export type SubmissionRow = {
  id: number;
  studentId: number;
  marks: number;
  resultStatus: number;
  classification: string | null;
  file_path: string | null;
  isPublished: boolean;
  gradedAt: string | null;
  publishedAt: string | null;
  status: number;
  submittedAt: string | null;
  isLate: boolean;
};

const STUDENT_SUBMISSION_STATUS: Record<number, string> = {
  0: "Submitted",
  1: "Late Submitted",
  2: "Graded",
};

export type SubmissionResult = {
  id: number;
  submissionId: number;
  marks: string;
  classification: string | null;
  isPublished: boolean;
};

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

export function getSubmissionColumns({
  results,
  saving,
  onGrade,
  onPublish,
}: {
  results: SubmissionResult[];
  saving?: boolean;
  onGrade: (row: SubmissionRow) => void;
  onPublish?: (result: SubmissionResult) => void;
}): DataTableColumnDef<SubmissionRow>[] {
  return [
    {
      accessorKey: "studentId",
      header: "Student ID",
    },
    {
      accessorKey: "submittedAt",
      header: "Submitted",
      cell: ({ row }) => (
        <span>
          {dateLabel(row.original.submittedAt)}
          {row.original.isLate && (
            <Badge variant="destructive" className="ms-2">
              Late
            </Badge>
          )}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline">
          {STUDENT_SUBMISSION_STATUS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: "file_path",
      header: "Attachment",
      cell: ({ row }) =>
        row.original.file_path ? (
          <Link
            href={row.original.file_path}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Submission
          </Link>
        ) : (
          "-"
        ),
    },
    {
      id: "result",
      header: "Result",
      cell: ({ row }) => {
        const result = results.find(
          (item) => item.submissionId === row.original.id,
        );
        if (result) {
          return `${result.marks}${
            result.classification ? ` (${result.classification})` : ""
          }`;
        }
        if (
          row.original.status === 2 &&
          row.original.marks &&
          `${row.original.marks} (${row.original.classification || ""})`
        ) {
          return `${row.original.marks} (${
            row.original.classification || ""
          })`;
        }
        return "";
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const result = results.find(
          (item) => item.submissionId === row.original.id,
        );
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!!result || saving}
              onClick={() => onGrade(row.original)}
            >
              Grade
            </Button>
            {result && !result.isPublished && onPublish && (
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => onPublish(result)}
              >
                Publish result
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}

export function SubmissionsDataTable({
  data,
  isLoading,
  results,
  saving,
  onGrade,
  onPublish,
}: {
  data: SubmissionRow[];
  isLoading?: boolean;
  results: SubmissionResult[];
  saving?: boolean;
  onGrade: (row: SubmissionRow) => void;
  onPublish?: (result: SubmissionResult) => void;
}) {
  return (
    <DataTable
      data={data}
      columns={getSubmissionColumns({ results, saving, onGrade, onPublish })}
      isLoading={isLoading}
      emptyMessage="No submissions yet."
      initialPageSize={5}
    />
  );
}
