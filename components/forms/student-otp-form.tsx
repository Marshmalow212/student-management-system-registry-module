"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const schema = z.object({ otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits") });
type OtpValues = z.infer<typeof schema>;

export function StudentOtpForm({ email, onVerify, onResend, isLoading, error }: { email: string; onVerify: (values: OtpValues) => Promise<void>; onResend: () => Promise<void>; isLoading?: boolean; error?: string | null }) {
  const form = useForm<OtpValues>({ resolver: zodResolver(schema), defaultValues: { otp: "" } });
  return <Card><CardHeader><CardTitle>Verify your account</CardTitle><CardDescription>Enter the six-digit OTP sent to {email}. It expires after 10 minutes.</CardDescription></CardHeader><CardContent><form onSubmit={form.handleSubmit(onVerify)} noValidate><FieldGroup>
    <Field data-invalid={!!form.formState.errors.otp}><FieldLabel htmlFor="student-otp">One-time password</FieldLabel><Input id="student-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} {...form.register("otp")} aria-invalid={!!form.formState.errors.otp} />{form.formState.errors.otp && <FieldDescription role="alert">{form.formState.errors.otp.message}</FieldDescription>}</Field>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={isLoading || form.formState.isSubmitting}>{isLoading ? "Verifying..." : "Verify account"}</Button>
    <Button type="button" variant="outline" disabled={isLoading} onClick={onResend}>Resend OTP</Button>
  </FieldGroup></form></CardContent></Card>;
}