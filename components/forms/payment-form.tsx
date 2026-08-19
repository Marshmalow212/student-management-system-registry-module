"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const moneyPattern = /^\d+(\.\d{1,2})?$/

const paymentSchema = z.object({
  reference: z.string().trim().min(1, "Reference is required").max(64),
  idempotencyKey: z.string().trim().min(1, "Payment Request Key is required").max(128),
  amount: z
    .string()
    .regex(moneyPattern, "Enter a positive amount with up to two decimals")
    .refine(
      (value) => value !== "0" && value !== "0.0" && value !== "0.00",
      "Amount must be positive"
    ),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code"),
  paymentDate: z.string().optional(),
})

export type PaymentFormValues = z.infer<typeof paymentSchema>

type PaymentFormProps = {
  balance?: string
  onSubmit: (values: PaymentFormValues) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  error?: string | null
}

function ErrorText({ message }: { message?: string }) {
  return message ? <FieldDescription role="alert">{message}</FieldDescription> : null
}

export function PaymentForm({
  balance,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: PaymentFormProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      reference: "",
      idempotencyKey:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `payment-${Date.now()}`,
      amount: "",
      currency: "USD",
      paymentDate: "",
    },
  })

  useEffect(() => {
    form.reset({
      reference: "",
      idempotencyKey:
        form.getValues("idempotencyKey") ||
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `payment-${Date.now()}`),
      amount: "",
      currency: "USD",
      paymentDate: "",
    })
  }, [form])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Payment</CardTitle>
        <CardDescription>
          Outstanding balance: {balance ?? "-"}. This creates an immutable payment ledger entry.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {(["reference", "idempotencyKey", "amount", "currency", "paymentDate"] as const).map(
              (name) => (
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
              )
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Recording..." : "Add Payment"}
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
  )
}
