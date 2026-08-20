"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CommonForm, ErrorText } from "@/components/ui/forms/common-form";

const programmeSchema = z.object({
  name: z.string().trim().min(1, "Programme name is required").max(255),
  fee: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a non-negative amount"),
  discount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a non-negative amount"),
  coupon: z.string().max(64).optional(),
  couponLimit: z.string().regex(/^$|^[1-9]\d*$/, "Enter a whole-number Coupon Usage Limit of at least 1").optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});
export type ProgrammeFormValues = z.infer<typeof programmeSchema>;
const programmeStatuses = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
const statusLabel = (status: string) => status[0] + status.slice(1).toLowerCase();

export function ProgrammeRegistryForm({ initialValues, onSubmit, onCancel, isLoading, error }: {
  initialValues?: Partial<ProgrammeFormValues>;
  onSubmit: (values: ProgrammeFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<ProgrammeFormValues>({ resolver: zodResolver(programmeSchema), defaultValues: { name: "", fee: "0", discount: "0", coupon: "", couponLimit: "", status: "ACTIVE", ...initialValues } });
  const fields = ["name", "fee", "discount", "coupon", "couponLimit"] as const;
  return <Card><CardHeader><CardTitle>{initialValues ? "Edit programme" : "Create programme"}</CardTitle><CardDescription>Catalogue pricing is submitted as numeric values and returned as precise strings.</CardDescription></CardHeader><CardContent><CommonForm form={form} onSubmit={onSubmit} error={error} actions={<div className="flex gap-2"><Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save programme"}</Button>{onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}</div>}>
    {fields.map((name) => <Field key={name} data-invalid={!!form.formState.errors[name]}><FieldLabel htmlFor={`registry-programme-${name}`}>{name === "fee" ? "Total Fee" : name === "couponLimit" ? "Coupon Usage Limit" : name[0].toUpperCase() + name.slice(1)}</FieldLabel><Input id={`registry-programme-${name}`} type={name === "name" || name === "coupon" ? "text" : "number"} min={name === "name" || name === "coupon" ? undefined : "1"} step={name === "couponLimit" ? "1" : name === "name" || name === "coupon" ? undefined : "0.01"} {...form.register(name)} aria-invalid={!!form.formState.errors[name]} /><ErrorText message={form.formState.errors[name]?.message} /></Field>)}
    <Field><FieldLabel>Status</FieldLabel><ToggleGroup aria-label="Programme status" value={[form.watch("status")]} onValueChange={(values) => { const value = values.at(-1); if (value) form.setValue("status", value as ProgrammeFormValues["status"], { shouldValidate: true }); }} variant="outline" spacing={0}>{programmeStatuses.map((status) => <ToggleGroupItem key={status} value={status}>{statusLabel(status)}</ToggleGroupItem>)}</ToggleGroup></Field>
  </CommonForm></CardContent></Card>;
}
