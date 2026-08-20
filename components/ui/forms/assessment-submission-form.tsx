"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import AssessmentUploader from "@/components/feature/assessment/assessment-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { CommonForm } from "@/components/ui/forms/common-form";

const submissionSchema = z.object({ assessmentFile: z.any().optional() });
export type SubmissionFormValues = z.infer<typeof submissionSchema>;

export function AssessmentSubmissionForm({ onSubmit, onCancel, isLoading, error }: {
  onSubmit: (values: SubmissionFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<SubmissionFormValues>({ resolver: zodResolver(submissionSchema), defaultValues: { assessmentFile: null } });
  const uploadHandler = (_file: File) => undefined;
  return <Card><CardHeader><CardTitle>Submit your assessment</CardTitle><CardDescription>Must be a PDF file and not exceed 10MB in size. Please ensure you have completed the assessment before submission.</CardDescription></CardHeader><CardContent><CommonForm form={form} onSubmit={onSubmit} error={error} actions={<div className="flex gap-2"><Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Upload Assessment"}</Button>{onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}</div>}>
    <Field><FieldLabel htmlFor="assessmentUploader">Upload Assessment File</FieldLabel><AssessmentUploader handleUpload={uploadHandler} /></Field>
  </CommonForm></CardContent></Card>;
}
