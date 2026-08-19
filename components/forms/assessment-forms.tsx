"use client";

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

const marksPattern = /^\d+(\.\d{1,2})?$/;
const assessmentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  subjectName: z.string().trim().max(160).optional(),
  programmeId: z.string().regex(/^[1-9]\d*$/, "Enter a valid programme ID"),
  dueDate: z.string().min(1, "Due date is required"),
  maxMarks: z
    .string()
    .regex(marksPattern, "Use a non-negative number with up to two decimals")
    .refine(
      (value) => Number(value) > 0,
      "Maximum marks must be greater than zero",
    ),
});
const submissionSchema = z.object({
  assessmentFile: z.any().optional(),
});
const gradeSchema = z.object({
  marks: z
    .string()
    .regex(marksPattern, "Use a non-negative number with up to two decimals"),
  classification: z.string().trim().max(80).optional(),
});

export type AssessmentFormValues = z.infer<typeof assessmentSchema>;
export type SubmissionFormValues = z.infer<typeof submissionSchema>;
export type GradeFormValues = z.infer<typeof gradeSchema>;

function ErrorText({ message }: { message?: string }) {
  return message ? (
    <FieldDescription role="alert">{message}</FieldDescription>
  ) : null;
}
function FormActions({
  loading,
  label,
  onCancel,
}: {
  loading?: boolean;
  label: string;
  onCancel?: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : label}
      </Button>
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  );
}

export function AssessmentForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: {
  initialValues?: Partial<AssessmentFormValues>;
  onSubmit: (values: AssessmentFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      title: "",
      subjectName: "",
      programmeId: "",
      dueDate: "",
      maxMarks: "100",
      ...initialValues,
    },
  });

  const checkSubmit = (e) => {
    e.preventDefault();
    console.log("Form values:", form.getValues());
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialValues ? "Edit draft assessment" : "Create assessment draft"}
        </CardTitle>
        <CardDescription>
          Programme IDs are used until a programme lookup endpoint is available.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate >
          <FieldGroup>
            {(
              [
                "title",
                "subjectName",
                "programmeId",
                "dueDate",
                "maxMarks",
              ] as const
            ).map((name) => (
              <Field key={name} data-invalid={!!form.formState.errors[name]}>
                <FieldLabel htmlFor={`assessment-${name}`}>
                  {name === "subjectName"
                    ? "Subject name (optional)"
                    : name === "programmeId"
                      ? "Programme ID"
                      : name === "dueDate"
                        ? "Due date"
                        : name === "maxMarks"
                          ? "Maximum marks"
                          : "Title"}
                </FieldLabel>
                <Input
                  id={`assessment-${name}`}
                  type={name === "dueDate" ? "datetime-local" : "text"}
                  inputMode={
                    name === "maxMarks" || name === "programmeId"
                      ? "decimal"
                      : undefined
                  }
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
            <FormActions
              loading={isLoading}
              label={initialValues ? "Save draft" : "Create draft"}
              onCancel={onCancel}
            />
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export function GradeForm({
  maxMarks,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: {
  maxMarks: string;
  onSubmit: (values: GradeFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: { marks: "", classification: "" },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grade submission</CardTitle>
        <CardDescription>
          Maximum marks: {maxMarks}. The API validates the final decimal-safe
          bound.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="grade-marks">Marks</FieldLabel>
              <Input
                id="grade-marks"
                inputMode="decimal"
                {...form.register("marks")}
                aria-invalid={!!form.formState.errors.marks}
              />
              <ErrorText message={form.formState.errors.marks?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="grade-classification">
                Classification (optional)
              </FieldLabel>
              <Input
                id="grade-classification"
                {...form.register("classification")}
                aria-invalid={!!form.formState.errors.classification}
              />
              <ErrorText
                message={form.formState.errors.classification?.message}
              />
            </Field>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <FormActions
              loading={isLoading}
              label="Save grade"
              onCancel={onCancel}
            />
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export { AssessmentSubmissionForm } from "@/components/forms/assessment-submission-form";
