"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CommonForm, ErrorText } from "@/components/ui/forms/common-form";

const studentSchema = z.object({
  studentUid: z.string().trim().min(1, "Student ID is required").max(64),
  fullName: z.string().trim().min(1, "Full name is required").max(255),
  email: z.string().trim().email("Enter a valid email").max(255),
  dateOfBirth: z.string().optional(),
  academicYear: z.string().regex(/^$|^(19\d{2}|20\d{2}|2[1-9]\d{2}|3000)$/, "Enter a valid Academic Year from 1900 to 3000").optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "GRADUATED", "SUSPENDED", "WITHDRAWN"]),
  programmeId: z.string().optional(),
  userId: z.string().optional(),
});
export type StudentFormValues = z.infer<typeof studentSchema>;

export function StudentRegistryForm({ initialValues, onSubmit, onCancel, isLoading, error }: {
  initialValues?: Partial<StudentFormValues>;
  onSubmit: (values: StudentFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<StudentFormValues>({ resolver: zodResolver(studentSchema), defaultValues: { studentUid: "", fullName: "", email: "", dateOfBirth: "", academicYear: "", status: "ACTIVE", programmeId: "", userId: "", ...initialValues } });
  const fields = ["studentUid", "fullName", "email", "dateOfBirth", "academicYear", "programmeId", "userId"] as const;
  return <Card><CardHeader><CardTitle>{initialValues ? "Edit student" : "Create student"}</CardTitle><CardDescription>Registry identity and optional account or programme links.</CardDescription></CardHeader><CardContent><CommonForm form={form} onSubmit={onSubmit} error={error} actions={<div className="flex gap-2"><Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save student"}</Button>{onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}</div>}>
    {fields.map((name) => <Field key={name} data-invalid={!!form.formState.errors[name]}><FieldLabel htmlFor={`registry-student-${name}`}>{name === "studentUid" ? "Student ID" : name === "programmeId" ? "Programme" : name === "userId" ? "Student account ID" : name === "dateOfBirth" ? "Date of Birth" : name === "academicYear" ? "Academic Year" : name === "fullName" ? "Full Name" : "Email"}</FieldLabel><Input id={`registry-student-${name}`} type={name === "dateOfBirth" ? "date" : name === "email" ? "email" : "text"} {...form.register(name)} aria-invalid={!!form.formState.errors[name]} /><ErrorText message={form.formState.errors[name]?.message} /></Field>)}
  </CommonForm></CardContent></Card>;
}
