"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CommonForm, ErrorText, FormActions } from "@/components/ui/forms/common-form";

const marksPattern = /^\d+(\.\d{1,2})?$/;
const gradeSchema = z.object({ marks: z.string().regex(marksPattern, "Use a non-negative number with up to two decimals"), classification: z.string().trim().max(80).optional() });
export type GradeFormValues = z.infer<typeof gradeSchema>;

export function GradeForm({ maxMarks, onSubmit, onCancel, isLoading, error }: {
  maxMarks: string;
  onSubmit: (values: GradeFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<GradeFormValues>({ resolver: zodResolver(gradeSchema), defaultValues: { marks: "", classification: "" } });
  return <Card><CardHeader><CardTitle>Grade submission</CardTitle><CardDescription>Maximum marks: {maxMarks}. The API validates the final decimal-safe bound.</CardDescription></CardHeader><CardContent><CommonForm form={form} onSubmit={onSubmit} error={error} actions={<FormActions loading={isLoading} label="Save grade" onCancel={onCancel} />}>
    <Field data-invalid={!!form.formState.errors.marks}><FieldLabel htmlFor="grade-marks">Marks</FieldLabel><Input id="grade-marks" inputMode="decimal" {...form.register("marks")} aria-invalid={!!form.formState.errors.marks} /><ErrorText message={form.formState.errors.marks?.message} /></Field>
    <Field data-invalid={!!form.formState.errors.classification}><FieldLabel htmlFor="grade-classification">Classification (optional)</FieldLabel><Input id="grade-classification" {...form.register("classification")} aria-invalid={!!form.formState.errors.classification} /><ErrorText message={form.formState.errors.classification?.message} /></Field>
  </CommonForm></CardContent></Card>;
}
