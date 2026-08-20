"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CommonForm, ErrorText } from "@/components/ui/forms/common-form";

const moneyPattern = /^\d+(\.\d{1,2})?$/;
const paymentSchema = z.object({
  reference: z.string().trim().min(1, "Reference is required").max(64),
  idempotencyKey: z.string().trim().min(1, "Payment Request Key is required").max(128),
  amount: z.string().regex(moneyPattern, "Enter a positive amount with up to two decimals").refine((value) => !["0", "0.0", "0.00"].includes(value), "Amount must be positive"),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code"),
  paymentDate: z.string().optional(),
});
export type PaymentFormValues = z.infer<typeof paymentSchema>;
function requestKey() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `payment-${Date.now()}`; }

export function PaymentForm({ balance, enrollmentId, reference, onSubmit, onCancel, isLoading, error }: {
  balance?: string;
  enrollmentId?: number;
  reference?: string;
  onSubmit: (values: PaymentFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<PaymentFormValues>({ resolver: zodResolver(paymentSchema), defaultValues: { reference: reference ?? "", idempotencyKey: requestKey(), amount: "", currency: "USD", paymentDate: "" } });
  useEffect(() => { form.reset({ reference: reference ?? "", idempotencyKey: form.getValues("idempotencyKey") || requestKey(), amount: "", currency: "USD", paymentDate: "" }); }, [form, reference]);
  return <Card><CardHeader><CardTitle>Add payment</CardTitle><CardDescription>Outstanding balance: {balance ?? "-"} for enrollment {enrollmentId ?? "-"}. Reference: {reference ?? "-"}. This creates an immutable staff ledger entry.</CardDescription></CardHeader><CardContent><CommonForm form={form} onSubmit={onSubmit} error={error} actions={<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel}>Close</Button><Button type="submit" disabled={isLoading}>{isLoading ? "Recording..." : "Add payment"}</Button></div>}>
    {(["reference", "idempotencyKey", "amount", "currency", "paymentDate"] as const).map((name) => <Field key={name}><FieldLabel htmlFor={`payment-${name}`}>{name === "idempotencyKey" ? "Payment Request Key (staff only)" : name === "paymentDate" ? "Payment Date" : name[0].toUpperCase() + name.slice(1)}</FieldLabel><Input id={`payment-${name}`} type={name === "paymentDate" ? "datetime-local" : "text"} inputMode={name === "amount" ? "decimal" : undefined} {...form.register(name)} aria-invalid={!!form.formState.errors[name]} /><ErrorText message={form.formState.errors[name]?.message} /></Field>)}
  </CommonForm></CardContent></Card>;
}
