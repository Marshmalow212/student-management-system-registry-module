"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommonForm, ErrorText } from "@/components/ui/forms/common-form";

const ROLE_OPTIONS = [
  { value: "1", label: "Staff" },
  { value: "2", label: "Registrar" },
  { value: "3", label: "Admin" },
];
const accountSchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(255),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  role: z.enum(["1", "2", "3"]),
});
export type StaffAccountFormValues = z.infer<typeof accountSchema>;

export function StaffAccountForm({ onSubmit, isLoading, error }: {
  onSubmit: (values: StaffAccountFormValues) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<StaffAccountFormValues>({ resolver: zodResolver(accountSchema), defaultValues: { name: "", email: "", password: "", role: "1" } });
  return (
    <CommonForm form={form} onSubmit={onSubmit} error={error} actions={
      <div className="flex justify-end"><Button type="submit" disabled={isLoading}>{isLoading ? "Creating account..." : "Create account"}</Button></div>
    }>
      <Field data-invalid={!!form.formState.errors.name}><FieldLabel htmlFor="account-name">Full name</FieldLabel><Input id="account-name" autoComplete="name" {...form.register("name")} aria-invalid={!!form.formState.errors.name} /><ErrorText message={form.formState.errors.name?.message} /></Field>
      <Field data-invalid={!!form.formState.errors.email}><FieldLabel htmlFor="account-email">Email</FieldLabel><Input id="account-email" type="email" autoComplete="email" {...form.register("email")} aria-invalid={!!form.formState.errors.email} /><ErrorText message={form.formState.errors.email?.message} /></Field>
      <Field data-invalid={!!form.formState.errors.password}><FieldLabel htmlFor="account-password">Temporary password</FieldLabel><Input id="account-password" type="password" autoComplete="new-password" {...form.register("password")} aria-invalid={!!form.formState.errors.password} /><ErrorText message={form.formState.errors.password?.message} /></Field>
      <Field data-invalid={!!form.formState.errors.role}><FieldLabel htmlFor="account-role">Account role</FieldLabel><Controller name="role" control={form.control} render={({ field }) => <Select name={field.name} value={field.value} onValueChange={(value) => value && field.onChange(value)} items={ROLE_OPTIONS}><SelectTrigger id="account-role" aria-label="Account role" aria-invalid={!!form.formState.errors.role} className="w-full"><SelectValue placeholder="Select an account role" /></SelectTrigger><SelectContent><SelectItem value="1">Staff</SelectItem><SelectItem value="2">Registrar</SelectItem><SelectItem value="3">Admin</SelectItem></SelectContent></Select>} /><ErrorText message={form.formState.errors.role?.message} /></Field>
    </CommonForm>
  );
}
