"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CommonForm, ErrorText, FormActions } from "@/components/ui/forms/common-form";

const marksPattern = /^\d+(\.\d{1,2})?$/;
const assessmentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  subjectName: z.string().trim().max(160).optional(),
  programmeId: z.string().regex(/^[1-9]\d*$/, "Enter a valid programme ID"),
  dueDate: z.string().min(1, "Due date is required"),
  maxMarks: z.string().regex(marksPattern, "Use a non-negative number with up to two decimals").refine((value) => Number(value) > 0, "Maximum marks must be greater than zero"),
});
export type AssessmentFormValues = z.infer<typeof assessmentSchema>;

export function AssessmentForm({ initialValues, onSubmit, onCancel, isLoading, error }: {
  initialValues?: Partial<AssessmentFormValues>;
  onSubmit: (values: AssessmentFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<AssessmentFormValues>({ resolver: zodResolver(assessmentSchema), defaultValues: { title: "", subjectName: "", programmeId: "", dueDate: "", maxMarks: "100", ...initialValues } });
  const fields = ["title", "subjectName", "programmeId", "dueDate", "maxMarks"] as const;
  return <Card><CardHeader><CardTitle>{initialValues ? "Edit draft assessment" : "Create assessment draft"}</CardTitle><CardDescription>Programme IDs are used until a programme lookup endpoint is available.</CardDescription></CardHeader><CardContent><CommonForm form={form} onSubmit={onSubmit} error={error} actions={<FormActions loading={isLoading} label={initialValues ? "Save draft" : "Create draft"} onCancel={onCancel} />}>
    {fields.map((name) => <Field key={name} data-invalid={!!form.formState.errors[name]}><FieldLabel htmlFor={`assessment-${name}`}>{name === "subjectName" ? "Subject name (optional)" : name === "programmeId" ? "Programme ID" : name === "dueDate" ? "Due date" : name === "maxMarks" ? "Maximum marks" : "Title"}</FieldLabel><Input id={`assessment-${name}`} type={name === "dueDate" ? "datetime-local" : "text"} inputMode={name === "maxMarks" || name === "programmeId" ? "decimal" : undefined} {...form.register(name)} aria-invalid={!!form.formState.errors[name]} /><ErrorText message={form.formState.errors[name]?.message} /></Field>)}
  </CommonForm></CardContent></Card>;
}
