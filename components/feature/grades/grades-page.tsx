"use client";

import { useCallback, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { AxiosInstance } from "@/lib/axios-client";
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
  GradesDataTable,
  type GradeRow,
} from "@/components/feature/tables/grades-data-table";
import { downloadResultsCsv } from "./export-results";

export type GradeResult = {
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
  classification: "A" | "B" | "C" | "D" | "F";
  isPublished: boolean;
  gradedAt: string;
  publishedAt: string | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
type Transcript = {
  student: {
    studentUid: string;
    fullName: string;
    programme?: { name: string } | null;
  };
  status: "NO_RESULTS" | "INCOMPLETE" | "COMPLETE";
  summary: {
    resultCount: number;
    publishedAssessmentCount: number;
    totalMarks: string;
    totalMaxMarks: string;
    percentage: string;
  };
  results: GradeResult[];
};
type Mode = "student" | "staff";
type ApiError = { error?: string; code?: string };

function errorMessage(reason: unknown) {
  const body =
    reason instanceof AxiosError
      ? (reason.response?.data as ApiError | undefined)
      : undefined;
  const messages: Record<string, string> = {
    UNAUTHORIZED: "Your session has expired. Please sign in again.",
    FORBIDDEN: "You do not have permission to view this report.",
    VALIDATION_ERROR: body?.error ?? "Check the selected filters.",
    STUDENT_NOT_FOUND: "The requested student profile was not found.",
    INTERNAL_ERROR: "The reporting service is unavailable. Try again.",
  };
  return (
    (body?.code && messages[body.code]) ||
    body?.error ||
    "The reporting service is unavailable. Try again."
  );
}

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function StatusMessage({ status }: { status: Transcript["status"] }) {
  if (status === "NO_RESULTS")
    return (
      <p className="py-8 text-center text-muted-foreground">
        No published results are available yet.
      </p>
    );
  if (status === "INCOMPLETE")
    return (
      <p
        role="status"
        className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
      >
        Transcript incomplete: published results are available for some, but not
        all, expected assessments.
      </p>
    );
  return (
    <p
      role="status"
      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm"
    >
      Transcript complete: all published programme assessments have results.
    </p>
  );
}

function ResultTable({
  results,
  staff,
}: {
  results: GradeResult[];
  staff: boolean;
}) {
  return (
    <GradesDataTable
      data={(results as unknown as GradeRow[]) || []}
      staff={staff}
    />
  );
}

export function GradesPage({ mode }: { mode: Mode }) {
  const staff = mode === "staff";
  const [results, setResults] = useState<GradeResult[]>([]);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [programmeId, setProgrammeId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await AxiosInstance.get(
        staff ? "/api/reports/results" : "/api/results",
        {
          params: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            programmeId: programmeId || undefined,
            studentId: staff ? studentId || undefined : undefined,
          },
        },
      );
      setResults(
        (response.data.data as GradeResult[]).filter(
          (result) => result.isPublished === true,
        ),
      );
      setPagination(response.data.pagination);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, programmeId, staff, studentId]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  async function loadTranscript() {
    setTranscript(null);
    setError(null);
    setLoading(true);
    try {
      const response = await AxiosInstance.get("/api/transcripts", {
        params: staff ? { studentId: studentId || undefined } : undefined,
      });
      setTranscript(response.data.data);
      setTranscriptOpen(true);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  const displayedTranscriptResults =
    transcript?.results.filter((result) => result.isPublished === true) ?? [];
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
      <header>
        <p className="text-sm text-muted-foreground">
          {staff ? "Staff workspace" : "Student workspace"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {staff ? "Results reporting" : "Results and transcript"}
        </h1>
        <p className="text-muted-foreground">
          {staff
            ? "Review published results and export the authorized report data."
            : "Review only results released by your institution."}
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            {staff ? "Published result report" : "Published results"}
          </CardTitle>
          <CardDescription>
            Newest grading activity first. Decimal values are shown exactly as
            returned by the API.
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label="Programme ID filter"
              inputMode="numeric"
              placeholder="Programme ID"
              value={programmeId}
              onChange={(event) => {
                setProgrammeId(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              className="w-40"
            />
            {staff && (
              <Input
                aria-label="Student ID filter"
                inputMode="numeric"
                placeholder="Student ID"
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value);
                  setPagination((current) => ({ ...current, page: 1 }));
                }}
                className="w-32"
              />
            )}
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                if (value)
                  setPagination((current) => ({
                    ...current,
                    page: 1,
                    pageSize: Number(value),
                  }));
              }}
            >
              <SelectTrigger aria-label="Results per page" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {staff && (
              <Button
                variant="outline"
                onClick={() => downloadResultsCsv(results)}
                disabled={results.length === 0}
              >
                Export CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((value) => (
                <Skeleton key={value} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <ResultTable results={results} staff={staff} />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {staff ? "Student transcript" : "Transcript summary"}
          </CardTitle>
          <CardDescription>
            {staff
              ? "Provide a student ID to request that student's published transcript."
              : "Your aggregate is calculated from published result rows only."}
          </CardDescription>
          {staff && (
            <Button
              className="w-fit"
              onClick={() => void loadTranscript()}
              disabled={!studentId || loading}
            >
              Load transcript
            </Button>
          )}
        </CardHeader>
        {!staff && !transcript && !loading && (
          <CardContent>
            <Button onClick={() => void loadTranscript()}>
              Load my transcript
            </Button>
          </CardContent>
        )}
      </Card>
      <Dialog
        open={transcriptOpen}
        onOpenChange={(open) => {
          setTranscriptOpen(open);
          if (!open) setTranscript(null);
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {staff ? "Student transcript" : "Transcript summary"}
            </DialogTitle>
            <DialogDescription>
              Published results and transcript details.
            </DialogDescription>
          </DialogHeader>
          {transcript && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <p>
                    {transcript.student.fullName} (
                    {transcript.student.studentUid})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Results</p>
                  <p>
                    {transcript.summary.resultCount} /{" "}
                    {transcript.summary.publishedAssessmentCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p>
                    {transcript.summary.totalMarks} /{" "}
                    {transcript.summary.totalMaxMarks}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Percentage</p>
                  <p>{transcript.summary.percentage}%</p>
                </div>
              </div>
              <StatusMessage status={transcript.status} />
              <ResultTable results={displayedTranscriptResults} staff={false} />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTranscriptOpen(false);
                    setTranscript(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
