"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const moneyPattern = /^\d+(\.\d{1,2})?$/;

const enrollmentSchema = z.object({
  reference: z.string().trim().min(1, "Reference is required").max(64),
  studentId: z.string().regex(/^[1-9]\d*$/, "Enter a valid student ID"),
  programmeId: z.string().regex(/^[1-9]\d*$/, "Enter a valid programme ID"),
  enrolledYear: z
    .string()
    .regex(
      /^(19\d{2}|20\d{2}|2[1-9]\d{2}|3000)$/,
      "Enter a year from 1900 to 3000",
    ),
  dueDate: z.string().optional(),
});

const paymentSchema = z.object({
  reference: z.string().trim().min(1, "Reference is required").max(64),
  idempotencyKey: z
    .string()
    .trim()
    .min(1, "Payment Request Key is required")
    .max(128),
  amount: z
    .string()
    .regex(moneyPattern, "Enter a positive amount with up to two decimals")
    .refine(
      (value) => value !== "0" && value !== "0.0" && value !== "0.00",
      "Amount must be positive",
    ),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code"),
  paymentDate: z.string().optional(),
});

export type EnrollmentFormValues = z.infer<typeof enrollmentSchema>;
export type PaymentFormValues = z.infer<typeof paymentSchema>;

type FormProps<T> = {
  onSubmit: (values: T) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
};

function ErrorText({ message }: { message?: string }) {
  return message ? (
    <FieldDescription role="alert">{message}</FieldDescription>
  ) : null;
}

export function EnrollmentForm({
  onSubmit,
  onCancel,
  isLoading,
  error,
}: FormProps<EnrollmentFormValues>) {
  const form = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      reference: "",
      studentId: "",
      programmeId: "",
      enrolledYear: String(new Date().getFullYear()),
      dueDate: "",
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create enrolment</CardTitle>
        <CardDescription>
          Use IDs from the active student and programme registries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {(
              [
                "reference",
                "studentId",
                "programmeId",
                "enrolledYear",
                "dueDate",
              ] as const
            ).map((name) => (
              <Field key={name}>
                <FieldLabel htmlFor={`enrollment-${name}`}>
                  {name === "studentId"
                    ? "Student ID"
                    : name === "programmeId"
                      ? "Programme"
                      : name === "enrolledYear"
                        ? "Enrollment Year"
                        : name === "dueDate"
                          ? "Due Date"
                          : "Enrollment reference"}
                </FieldLabel>
                <Input
                  id={`enrollment-${name}`}
                  type={name === "dueDate" ? "date" : "text"}
                  {...form.register(name)}
                  aria-invalid={!!form.formState.errors[name]}
                />
                <ErrorText message={form.formState.errors[name]?.message} />
              </Field>
            ))}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create enrolment"}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export function PaymentForm({
  balance,
  enrollmentId,
  reference,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: FormProps<PaymentFormValues> & {
  balance?: string;
  enrollmentId?: number;
  reference?: string;
}) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      reference: reference ?? "",
      idempotencyKey:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `payment-${Date.now()}`,
      amount: "",
      currency: "USD",
      paymentDate: "",
    },
  });

  useEffect(() => {
    form.reset({
      reference: reference ?? "",
      idempotencyKey:
        form.getValues("idempotencyKey") ||
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `payment-${Date.now()}`),
      amount: "",
      currency: "USD",
      paymentDate: "",
    });
  }, [form, reference]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add payment</CardTitle>
        <CardDescription>
          Outstanding balance: {balance ?? "-"} for enrollment{" "}
          {enrollmentId ?? "-"}. Reference: {reference ?? "-"}. This creates an
          immutable staff ledger entry.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {(
              [
                "reference",
                "idempotencyKey",
                "amount",
                "currency",
                "paymentDate",
              ] as const
            ).map((name) => (
              <Field key={name}>
                <FieldLabel htmlFor={`payment-${name}`}>
                  {name === "idempotencyKey"
                    ? "Payment Request Key (staff only)"
                    : name === "paymentDate"
                      ? "Payment Date"
                      : name[0].toUpperCase() + name.slice(1)}
                </FieldLabel>
                <Input
                  id={`payment-${name}`}
                  type={
                    name === "paymentDate"
                      ? "datetime-local"
                      : name === "amount"
                        ? "text"
                        : "text"
                  }
                  inputMode={name === "amount" ? "decimal" : undefined}
                  {...form.register(name)}
                  aria-invalid={!!form.formState.errors[name]}
                />
                <ErrorText message={form.formState.errors[name]?.message} />
              </Field>
            ))}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Close
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Recording..." : "Add payment"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
