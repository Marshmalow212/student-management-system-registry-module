import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import AssessmentUploader from "@/components/feature/assessment/assessment-upload";
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
import { uploadAssessmentFile } from "@/redux/features/assessment/assessmentThunk";
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

export type AssessmentFormValues = z.infer<typeof assessmentSchema>;
export type SubmissionFormValues = z.infer<typeof submissionSchema>;

export function AssessmentSubmissionForm({
  onSubmit,
  onCancel,
  isLoading,
  error,
}: {
  onSubmit: (values: SubmissionFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      assessmentFile: null,
    },
  });

  const uploadHandler = (file: File) => {
    
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit your assessment</CardTitle>
        <CardDescription>
          Must be a PDF file and not exceed 10MB in size. Please ensure you
          have completed the assessment before submission.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field key="assessmentUploader">
              <FieldLabel htmlFor="assessmentUploader">
                Upload Assessment File
              </FieldLabel>
              <AssessmentUploader handleUpload={uploadHandler} />
            </Field>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <FormActions
              loading={isLoading}
              label="Upload Assessment"
              onCancel={onCancel}
            />
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
