"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommonForm, ErrorText } from "@/components/ui/forms/common-form";

const registrationSchema = z.object({ fullName: z.string().trim().min(1, "Full name is required").max(255), dateOfBirth: z.string().optional(), programmeId: z.string().regex(/^[1-9]\d*$/, "Choose an active programme") });
export type StudentRegistrationFormValues = z.infer<typeof registrationSchema>;
type ProgrammeOption = { id: number; name: string };

export function StudentRegistryRegistrationForm({ onSubmit, onCancel, programmes, isLoading, error }: {
  onSubmit: (values: StudentRegistrationFormValues) => Promise<void>;
  onCancel: () => void;
  programmes: ProgrammeOption[];
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<StudentRegistrationFormValues>({ resolver: zodResolver(registrationSchema), defaultValues: { fullName: "", dateOfBirth: "", programmeId: "" } });
  const programmeItems = programmes.map(({ id, name }) => ({ label: name, value: String(id) }));
  const year = new Date().getFullYear();
  return <CommonForm form={form} onSubmit={onSubmit} error={error} actions={<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button><Button type="submit" disabled={isLoading}>{isLoading ? "Registering..." : "Register student"}</Button></div>}>
    <p className="text-sm text-muted-foreground">Current academic year: {year}. A Student ID and enrolment reference will be generated automatically.</p>
    <Field data-invalid={!!form.formState.errors.fullName}><FieldLabel htmlFor="student-registration-fullName">Full name</FieldLabel><Input id="student-registration-fullName" {...form.register("fullName")} aria-invalid={!!form.formState.errors.fullName} /><ErrorText message={form.formState.errors.fullName?.message} /></Field>
    <Field data-invalid={!!form.formState.errors.dateOfBirth}><FieldLabel htmlFor="student-registration-dateOfBirth">Date of birth (optional)</FieldLabel><Input id="student-registration-dateOfBirth" type="date" {...form.register("dateOfBirth")} aria-invalid={!!form.formState.errors.dateOfBirth} /><ErrorText message={form.formState.errors.dateOfBirth?.message} /></Field>
    <Field data-invalid={!!form.formState.errors.programmeId}><FieldLabel htmlFor="student-registration-programmeId">Programme</FieldLabel><Select items={programmeItems} name="programmeId" value={form.watch("programmeId")} onValueChange={(value) => value && form.setValue("programmeId", value, { shouldValidate: true })}><SelectTrigger id="student-registration-programmeId" aria-label="Programme" aria-invalid={!!form.formState.errors.programmeId} className="w-full"><SelectValue placeholder={programmeItems.length ? "Select a programme" : "No active programmes available"} /></SelectTrigger><SelectContent><SelectGroup>{programmeItems.map((programme) => <SelectItem key={programme.value} value={programme.value}>{programme.label}</SelectItem>)}</SelectGroup></SelectContent></Select><ErrorText message={form.formState.errors.programmeId?.message} /></Field>
  </CommonForm>;
}
