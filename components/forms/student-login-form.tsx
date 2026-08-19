"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const schema = z.object({ email: z.string().trim().email("Enter a valid email"), password: z.string().min(1, "Password is required") });
export type StudentLoginValues = z.infer<typeof schema>;

export function StudentLoginForm({ onSubmit, isLoading, error }: { onSubmit: (values: StudentLoginValues) => Promise<void>; isLoading?: boolean; error?: string | null }) {
  const form = useForm<StudentLoginValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  return <Card><CardHeader><CardTitle>Student sign in</CardTitle><CardDescription>Sign in with your verified student account.</CardDescription></CardHeader><CardContent><form onSubmit={form.handleSubmit(onSubmit)} noValidate><FieldGroup>
    <Field data-invalid={!!form.formState.errors.email}><FieldLabel htmlFor="student-login-email">Email</FieldLabel><Input id="student-login-email" type="email" autoComplete="email" {...form.register("email")} aria-invalid={!!form.formState.errors.email} />{form.formState.errors.email && <FieldDescription role="alert">{form.formState.errors.email.message}</FieldDescription>}</Field>
    <Field data-invalid={!!form.formState.errors.password}><FieldLabel htmlFor="student-login-password">Password</FieldLabel><Input id="student-login-password" type="password" autoComplete="current-password" {...form.register("password")} aria-invalid={!!form.formState.errors.password} />{form.formState.errors.password && <FieldDescription role="alert">{form.formState.errors.password.message}</FieldDescription>}</Field>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={isLoading || form.formState.isSubmitting}>{isLoading ? "Signing in..." : "Sign in"}</Button>
    <FieldDescription className="text-center">Need an account? <a href="/student/register" className="underline">Register</a></FieldDescription>
  </FieldGroup></form></CardContent></Card>;
}