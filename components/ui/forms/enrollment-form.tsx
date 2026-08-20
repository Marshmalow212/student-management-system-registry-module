"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CommonForm, ErrorText } from "@/components/ui/forms/common-form";

const enrollmentSchema = z.object({
  reference: z.string().trim().min(1, "Reference is required").max(64),
  studentId: z.string().regex(/^[1-9]\d*$/, "Enter a valid student ID"),
  programmeId: z.string().regex(/^[1-9]\d*$/, "Enter a valid programme ID"),
  enrolledYear: z.string().regex(/^(19\d{2}|20\d{2}|2[1-9]\d{2}|3000)$/, "Enter a year from 1900 to 3000"),
  dueDate: z.string().optional(),
});
export type EnrollmentFormValues = z.infer<typeof enrollmentSchema>;

export function EnrollmentForm({ onSubmit, onCancel, isLoading, error }: {
  onSubmit: (values: EnrollmentFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<EnrollmentFormValues>({ resolver: zodResolver(enrollmentSchema), defaultValues: { reference: "", studentId: "", programmeId: "", enrolledYear: String(new Date().getFullYear()), dueDate: "" } });
  const fields = ["reference", "studentId", "programmeId", "enrolledYear", "dueDate"] as const;
  return <Card><CardHeader><CardTitle>Create enrolment</CardTitle><CardDescription>Use IDs from the active student and programme registries.</CardDescription></CardHeader><CardContent><CommonForm form={form} onSubmit={onSubmit} error={error} actions={<div className="flex gap-2"><Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create enrolment"}</Button>{onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}</div>}>
    {fields.map((name) => <Field key={name} data-invalid={!!form.formState.errors[name]}><FieldLabel htmlFor={`enrollment-${name}`}>{name === "studentId" ? "Student ID" : name === "programmeId" ? "Programme" : name === "enrolledYear" ? "Enrollment Year" : name === "dueDate" ? "Due Date" : "Enrollment reference"}</FieldLabel><Input id={`enrollment-${name}`} type={name === "dueDate" ? "date" : "text"} {...form.register(name)} aria-invalid={!!form.formState.errors[name]} /><ErrorText message={form.formState.errors[name]?.message} /></Field>)}
  </CommonForm></CardContent></Card>;
}
