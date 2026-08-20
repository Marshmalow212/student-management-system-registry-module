"use client";

import type { ReactNode } from "react";
import type { FieldValues, SubmitHandler, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldGroup } from "@/components/ui/field";

export function FormError({ message }: { message?: string | null }) {
  return message ? (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

export function FormActions({
  loading,
  label,
  loadingLabel = "Saving...",
  onCancel,
  cancelLabel = "Cancel",
}: {
  loading?: boolean;
  label: string;
  loadingLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  return (
    <div className="flex gap-2">
      <Button type="submit" disabled={loading}>
        {loading ? loadingLabel : label}
      </Button>
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
      )}
    </div>
  );
}

export function CommonForm<TValues extends FieldValues>({
  form,
  onSubmit,
  children,
  error,
  actions,
}: {
  form: UseFormReturn<TValues>;
  onSubmit: SubmitHandler<TValues>;
  children: ReactNode;
  error?: string | null;
  actions?: ReactNode;
}) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {children}
        <FormError message={error} />
        {actions}
      </FieldGroup>
    </form>
  );
}

export function ErrorText({ message }: { message?: string }) {
  return message ? (
    <FieldDescription role="alert">{message}</FieldDescription>
  ) : null;
}
