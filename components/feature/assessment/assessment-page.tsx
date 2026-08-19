"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/redux/hooks";
import { AxiosError } from "axios";
import { AxiosInstance } from "@/lib/axios-client";
import { toast } from "@/components/ui/toast";
import {
  AssessmentForm,
  GradeForm,
  type AssessmentFormValues,
  type GradeFormValues,
  type SubmissionFormValues,
} from "@/components/forms/assessment-forms";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AssessmentUploader from "./assessment-upload";
import Link from "next/link";

const STUDENT_SUBMISSION_STATUS: Record<number, string> = {
  0: "Submitted",
  1: "Late Submitted",
  2: "Graded",
};

type Mode = "staff" | "student";
type Assessment = {
  id: number;
  title: string;
  subjectName: string | null;
  programmeId: number;
  dueDate: string;
  maxMarks: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | "RESULT";
  programme?: { name: string };
  submissions?: Array<{
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
  }>;
};
type Submission = {
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
type Result = {
  id: number;
  assessmentId: number;
  studentId: number;
  submissionId: number;
  marks: string;
  classification: string | null;
  resultStatus: "PENDING" | "IN_PROGRESS" | "ON_HOLD" | "PUBLISHED";
  isPublished: boolean;
  gradedAt: string;
};
type ApiError = { error?: string; code?: string };

function apiError(reason: unknown) {
  const body =
    reason instanceof AxiosError
      ? (reason.response?.data as ApiError | undefined)
      : undefined;
  const messages: Record<string, string> = {
    UNAUTHORIZED: "Your session has expired. Please sign in again.",
    FORBIDDEN: "You do not have permission to perform this action.",
    VALIDATION_ERROR: body?.error ?? "Check the submitted fields.",
    ASSESSMENT_NOT_FOUND: "This assessment is no longer available.",
    ASSESSMENT_NOT_EDITABLE: "Only draft assessments can be edited.",
    INVALID_STATUS_TRANSITION:
      "That assessment lifecycle transition is not allowed.",
    ASSESSMENT_NOT_OPEN: "This assessment is not open for submission.",
    DEADLINE_PASSED: "The submission deadline has passed.",
    SUBMISSION_EXISTS: "You already submitted work for this assessment.",
    MARKS_EXCEED_MAX: "Marks cannot exceed the assessment maximum.",
    RESULT_EXISTS: "This submission already has a result.",
    RESULT_ALREADY_PUBLISHED: "This result has already been published.",
    RESULT_ON_HOLD:
      "This result is on hold until the student's outstanding fees are cleared.",
    ENROLLMENT_REQUIRED:
      "An active student enrolment is required before publishing this result.",
    INTERNAL_ERROR: "The assessment service is unavailable. Try again.",
  };
  return (
    (body?.code && messages[body.code]) ||
    body?.error ||
    "The assessment service is unavailable. Try again."
  );
}
function dateLabel(value: string) {
  return new Date(value).toLocaleString();
}

export function AssessmentPage({ mode }: { mode: Mode }) {
  const staff = mode === "staff";
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [grading, setGrading] = useState<Submission | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const assessmentState = useAppSelector((state) => state.assessment);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = staff
        ? { status: status === "ALL" ? undefined : status }
        : undefined;
      const [
        assessmentResponse,
        submissionResponse,
        resultResponse,
        dashboardResponse,
      ] = await Promise.all([
        AxiosInstance.get("/api/assessments", { params }),
        AxiosInstance.get("/api/submissions"),
        AxiosInstance.get("/api/results"),
        staff
          ? Promise.resolve({ data: { data: null } })
          : AxiosInstance.get("/api/student/dashboard"),
      ]);
      setAssessments(assessmentResponse.data.data);
      setSubmissions(submissionResponse.data.data);
      setResults(resultResponse.data.data);
      if (!staff) setStudentId(dashboardResponse.data.data?.studentId ?? null);
    } catch (reason) {
      setError(apiError(reason));
    } finally {
      setLoading(false);
    }
  }, [staff, status]);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return assessments.filter(
      (item) =>
        !needle ||
        [item.title, item.subjectName ?? "", item.programme?.name ?? ""].some(
          (value) => value.toLowerCase().includes(needle),
        ),
    );
  }, [assessments, search]);
  // const selectedSubmission = selected
  //   ? submissions.filter((item) => item.assessmentId === selected.id)
  //   : [];
  async function selectAssessment(item: Assessment) {
    setSelected(item);
    setError(null);
    try {
      const response = await AxiosInstance.get(`/api/assessments/${item.id}`);
      setSelected(response.data.data);
    } catch (reason) {
      setError(apiError(reason));
    }
  }
  async function saveAssessment(values: AssessmentFormValues) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...values,
        programmeId: Number(values.programmeId),
        dueDate: new Date(values.dueDate).toISOString(),
        subjectName: values.subjectName || null,
      };
      const response = selected
        ? await AxiosInstance.patch(
            `/api/assessments/${selected?.id ?? 0}`,
            payload,
          )
        : await AxiosInstance.post("/api/assessments", payload);
      setSelected(response.data.data);
      setShowAssessmentForm(false);
      await load();
    } catch (reason) {
      setError(apiError(reason));
    } finally {
      setSaving(false);
    }
  }
  async function transition(nextStatus: "OPEN" | "CLOSED" | "RESULT") {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const response = await AxiosInstance.patch(
        `/api/assessments/${selected.id}`,
        { status: nextStatus },
      );
      setSelected(response.data.data);
      await load();
    } catch (reason) {
      setError(apiError(reason));
    } finally {
      setSaving(false);
    }
  }
  async function submit() {
    if (!selected) {
      setShowSubmissionForm(false);
      return;
    }
    const filePath = assessmentState.uploadedFilePath ?? null;
    if (!filePath) {
      setError("Please upload a PDF file before submitting.");
      setShowSubmissionForm(false);
      toast.add({
        title: "Submission failed",
        description: "Please upload a PDF file before submitting.",
        type: "destructive",
      });
      return;
    }
    setSaving(true);
    setError(null);
    if (!studentId) {
      setError("Student profile could not be identified.");
      setShowSubmissionForm(false);
      toast.add({
        title: "Submission failed",
        description: "Student profile could not be identified.",
        type: "destructive",
      });
      return;
    }
    const assessmentSubmissionData = {
      student_id: studentId,
      programme_id: selected.programmeId,
      assessment_id: selected.id,
      file_path: filePath,
    };
    try {
      await AxiosInstance.post("/api/submissions", assessmentSubmissionData);
      setShowSubmissionForm(false);
      await load();
    } catch (reason) {
      setError(apiError(reason));
    } finally {
      setSaving(false);
    }
  }
  async function grade(values: GradeFormValues) {
    if (!grading) return;
    setSaving(true);
    setError(null);
    try {
      await AxiosInstance.post("/api/results", {
        submissionId: grading.id,
        marks: values.marks,
        classification: values.classification || null,
      });
      setGrading(null);
      await load();
    } catch (reason) {
      setError(apiError(reason));
    } finally {
      setSaving(false);
    }
  }
  async function publishResult(result: Result) {
    setSaving(true);
    setError(null);
    try {
      await AxiosInstance.patch(`/api/results/${result.id}`, {});
      await load();
    } catch (reason) {
      setError(apiError(reason));
    } finally {
      setSaving(false);
    }
  }
  async function publishAssessmentResults(override = false) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const response = await AxiosInstance.post("/api/results/publish", {
        assessmentId: selected.id,
        override,
      });
      const held = response.data.data.onHold as number;
      if (held > 0) {
        setError(
          `${held} result${held === 1 ? "" : "s"} placed on hold because of overdue fees.`,
        );
      }
      await load();
    } catch (reason) {
      setError(apiError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {staff ? "Staff workspace" : "Student workspace"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground">
            {staff
              ? "Manage lifecycle, submissions, grading, and published results."
              : "Review published work, submit before the deadline, and view released results."}
          </p>
        </div>
        {staff && (
          <Button
            onClick={() => {
              setSelected(null);
              setShowAssessmentForm(true);
            }}
          >
            Create draft
          </Button>
        )}
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <Dialog open={showAssessmentForm} onOpenChange={setShowAssessmentForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected ? "Edit draft assessment" : "Create assessment draft"}
            </DialogTitle>
            <DialogDescription>
              Save changes to reload the catalogue.
            </DialogDescription>
          </DialogHeader>
          <AssessmentForm
            initialValues={
              selected
                ? {
                    title: selected.title,
                    subjectName: selected.subjectName ?? "",
                    programmeId: String(selected.programmeId),
                    dueDate: selected.dueDate.slice(0, 16),
                    maxMarks: selected.maxMarks,
                  }
                : undefined
            }
            onSubmit={saveAssessment}
            onCancel={() => setShowAssessmentForm(false)}
            isLoading={saving}
            error={error}
          />
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader>
          <CardTitle>
            {staff ? "Assessment catalogue" : "Published assessments"}
          </CardTitle>
          <CardDescription>
            {visible.length} matching assessment
            {visible.length === 1 ? "" : "s"}
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label="Search assessments"
              placeholder="Search title, subject, or programme"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-md"
            />
            {staff && (
              <Select
                value={status}
                onValueChange={(value) => value && setStatus(value)}
              >
                <SelectTrigger
                  aria-label="Filter assessments by status"
                  className="w-44"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {["DRAFT", "PUBLISHED", "CLOSED"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              No assessments found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Maximum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((item) => (
                  <TableRow
                    key={item.id}
                    tabIndex={0}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.subjectName || "-"}</TableCell>
                    <TableCell>{dateLabel(item.dueDate)}</TableCell>
                    <TableCell>{item.maxMarks}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "OPEN"
                            ? "default"
                            : item.status === "CLOSED" ||
                                item.status === "RESULT"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button onClick={() => void selectAssessment(item)}>
                        Details
                      </Button>
                      {/* {item.status === "OPEN" &&
                        new Date(item.dueDate) > new Date() && (
                          <Button onClick={() => setShowSubmissionForm(true)}>
                            Submit work
                          </Button>
                        )} */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {selected && (
        <Dialog
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) {
              setSelected(null);
              setShowSubmissionForm(false);
            }
          }}
        >
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Assessment details</DialogTitle>
              <DialogDescription>
                Assessment status, submissions, and published results.
              </DialogDescription>
            </DialogHeader>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{selected.title}</CardTitle>
                    <CardDescription>
                      {selected.subjectName || "No subject"} · Programme{" "}
                      {selected.programme?.name} · Due{" "}
                      {dateLabel(selected.dueDate)}
                    </CardDescription>
                  </div>
                  <Badge>{selected.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {staff ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={saving || selected.status !== "DRAFT"}
                        onClick={() => setShowAssessmentForm(true)}
                      >
                        Edit draft
                      </Button>
                      <Button
                        disabled={saving || selected.status !== "DRAFT"}
                        onClick={() => void transition("OPEN")}
                      >
                        Open assessment
                      </Button>
                      <Button
                        variant="outline"
                        disabled={saving || selected.status !== "OPEN"}
                        onClick={() => void transition("CLOSED")}
                      >
                        Close
                      </Button>
                      <Button
                        disabled={
                          saving ||
                          !["CLOSED", "RESULT"].includes(selected.status)
                        }
                        onClick={() => void publishAssessmentResults()}
                      >
                        Publish results
                      </Button>
                    </div>
                    <div>
                      <h2 className="mb-3 font-medium">Submissions</h2>
                      {selected?.submissions?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No submissions yet.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student ID</TableHead>
                              <TableHead>Submitted</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Attachment</TableHead>
                              <TableHead>Result</TableHead>
                              <TableHead>
                                <span className="sr-only">Actions</span>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selected?.submissions?.map((submission) => {
                              console.log("submission", submission);
                              const result = results.find(
                                (item) => item.submissionId === submission.id,
                              );
                              return (
                                <TableRow key={submission.id}>
                                  <TableCell>{submission.studentId}</TableCell>
                                  <TableCell>
                                    {dateLabel(
                                      submission.submittedAt as string,
                                    )}
                                    {submission.isLate && (
                                      <Badge
                                        variant="destructive"
                                        className="ms-2"
                                      >
                                        Late
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {
                                        STUDENT_SUBMISSION_STATUS[
                                          submission.status
                                        ]
                                      }
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {submission.file_path ? (
                                      <Link
                                        href={submission.file_path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        View Submission
                                      </Link>
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {result
                                      ? `${result.marks}${result.classification ? ` (${result.classification})` : ""}`
                                      : ""}
                                    {submission.status === 2 &&
                                      submission.marks &&
                                      `${submission.marks} (${submission.classification || ""})`}
                                  </TableCell>
                                  <TableCell className="flex gap-2">
                                    <Button
                                      size="sm"
                                      disabled={!!result || saving}
                                      onClick={() => setGrading(submission)}
                                    >
                                      Grade
                                    </Button>
                                    {result && !result.isPublished && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={saving}
                                        onClick={() =>
                                          void publishResult(result)
                                        }
                                      >
                                        Publish result
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm">
                      Marks: <strong>{selected.maxMarks}</strong>
                    </p>
                    {selected.status === "OPEN" &&
                      new Date(selected.dueDate) > new Date() &&
                      !(selected?.submissions?.length as number > 0) && (
                        <>
                          <AssessmentUploader />
                          <Button onClick={() => submit()} disabled={saving}>
                            Submit work
                          </Button>
                        </>
                      )}
                    {selected.status === "OPEN" &&
                      new Date(selected.dueDate) <= new Date() && (
                        <p
                          role="status"
                          className="text-sm text-muted-foreground"
                        >
                          The deadline has passed; submissions are closed.
                        </p>
                      )}
                    {selected?.submissions?.length as number > 0 && (
                      <p role="status" className="text-sm">
                        Submission status:{" "}
                        <strong>
                          {
                            STUDENT_SUBMISSION_STATUS[
                              selected?.submissions?.at(0)?.status as number
                            ]
                          }
                        </strong>
                      </p>
                    )}
                    {results
                      .filter(
                        (item) =>
                          item.assessmentId === selected.id && item.isPublished,
                      )
                      .map((result) => (
                        <p key={result.id} role="status">
                          Published result: <strong>{result.marks}</strong>
                          {result.classification
                            ? ` (${result.classification})`
                            : ""}
                        </p>
                      ))}
                  </>
                )}
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelected(null);
                  setShowSubmissionForm(false);
                }}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Dialog
        open={!!grading}
        onOpenChange={(open) => !open && setGrading(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade submission</DialogTitle>
            <DialogDescription>
              Marks are validated against the assessment maximum.
            </DialogDescription>
          </DialogHeader>
          {grading && (
            <GradeForm
              maxMarks={selected?.maxMarks ?? "-"}
              onSubmit={grade}
              onCancel={() => setGrading(null)}
              isLoading={saving}
              error={error}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
