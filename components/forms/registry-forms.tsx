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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const studentSchema = z.object({
  studentUid: z.string().trim().min(1, "Student ID is required").max(64),
  fullName: z.string().trim().min(1, "Full name is required").max(255),
  email: z.string().trim().email("Enter a valid email").max(255),
  dateOfBirth: z.string().optional(),
  academicYear: z
    .string()
    .regex(
      /^$|^(19\d{2}|20\d{2}|2[1-9]\d{2}|3000)$/,
      "Enter a valid Academic Year from 1900 to 3000",
    )
    .optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "GRADUATED", "SUSPENDED", "WITHDRAWN"]),
  programmeId: z.string().optional(),
  userId: z.string().optional(),
});

const programmeSchema = z.object({
  name: z.string().trim().min(1, "Programme name is required").max(255),
  fee: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a non-negative amount"),
  discount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a non-negative amount"),
  coupon: z.string().max(64).optional(),
  couponLimit: z
    .string()
    .regex(
      /^$|^[1-9]\d*$/,
      "Enter a whole-number Coupon Usage Limit of at least 1",
    )
    .optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});
const registrationSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(255),
  // email: z.string().trim().email("Enter a valid email").max(255),
  dateOfBirth: z.string().optional(),
  programmeId: z.string().regex(/^[1-9]\d*$/, "Choose an active programme"),
});

export type StudentFormValues = z.infer<typeof studentSchema>;
export type ProgrammeFormValues = z.infer<typeof programmeSchema>;
export type StudentRegistrationFormValues = z.infer<typeof registrationSchema>;

const programmeStatuses = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
const statusLabel = (status: string) =>
  status[0] + status.slice(1).toLowerCase();

function ErrorText({ message }: { message?: string }) {
  return message ? (
    <FieldDescription role="alert">{message}</FieldDescription>
  ) : null;
}

type ProgrammeOption = { id: number; name: string };

export function StudentRegistrationForm({
  onSubmit,
  onCancel,
  programmes,
  isLoading,
  error,
}: {
  onSubmit: (values: StudentRegistrationFormValues) => Promise<void>;
  onCancel: () => void;
  programmes: ProgrammeOption[];
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<StudentRegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      // email: "",
      dateOfBirth: "",
      programmeId: "",
    },
  });
  const year = new Date().getFullYear();
  const programmeItems = programmes.map(({ id, name }) => ({
    label: name,
    value: String(id),
  }));
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          Current academic year: {year}. A Student ID and enrolment reference
          will be generated automatically.
        </p>
        {(["fullName", /*"email",*/ "dateOfBirth"] as const).map((name) => (
          <Field key={name} data-invalid={!!form.formState.errors[name]}>
            <FieldLabel htmlFor={`student-registration-${name}`}>
              {name === "fullName"
                ? "Full name"
                : name === "dateOfBirth"
                  ? "Date of birth (optional)"
                  : ""}
            </FieldLabel>
            <Input
              id={`student-registration-${name}`}
              type={
                name === "dateOfBirth"
                  ? "date"
                  : "text"
              }
              {...form.register(name)}
              aria-invalid={!!form.formState.errors[name]}
            />
            <ErrorText message={form.formState.errors[name]?.message} />
          </Field>
        ))}
        <Field data-invalid={!!form.formState.errors.programmeId}>
          <FieldLabel htmlFor="student-registration-programmeId">
            Programme
          </FieldLabel>
          <Select
            items={programmeItems.length ? programmeItems : []}
            name="programmeId"
            value={form.watch("programmeId")}
            onValueChange={(value) => {
              if (value)
                form.setValue("programmeId", value, { shouldValidate: true });
            }}
          >
            <SelectTrigger
              id="student-registration-programmeId"
              aria-label="Programme"
              aria-invalid={!!form.formState.errors.programmeId}
              className="w-full"
            >
              <SelectValue
                placeholder={
                  programmeItems.length
                    ? "Select a programme"
                    : "No active programmes available"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {programmeItems.map((programme) => (
                  <SelectItem
                    key={programme.value}
                    value={String(programme.value)}
                  >
                    {programme.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <ErrorText message={form.formState.errors.programmeId?.message} />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Registering..." : "Register student"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function StudentRegistryForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: {
  initialValues?: Partial<StudentFormValues>;
  onSubmit: (values: StudentFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      studentUid: "",
      fullName: "",
      email: "",
      dateOfBirth: "",
      academicYear: "",
      status: "ACTIVE",
      programmeId: "",
      userId: "",
      ...initialValues,
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialValues ? "Edit student" : "Create student"}
        </CardTitle>
        <CardDescription>
          Registry identity and optional account or programme links.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {[
              "studentUid",
              "fullName",
              "email",
              "dateOfBirth",
              "academicYear",
              "programmeId",
              "userId",
            ].map((name) => (
              <Field
                key={name}
                data-invalid={
                  !!form.formState.errors[name as keyof StudentFormValues]
                }
              >
                <FieldLabel htmlFor={`registry-student-${name}`}>
                  {name === "studentUid"
                    ? "Student ID"
                    : name === "programmeId"
                      ? "Programme"
                      : name === "userId"
                        ? "Student account ID"
                        : name === "dateOfBirth"
                          ? "Date of Birth"
                          : name === "academicYear"
                            ? "Academic Year"
                            : name === "fullName"
                              ? "Full Name"
                              : "Email"}
                </FieldLabel>
                <Input
                  id={`registry-student-${name}`}
                  type={
                    name === "dateOfBirth"
                      ? "date"
                      : name === "email"
                        ? "email"
                        : "text"
                  }
                  {...form.register(name as keyof StudentFormValues)}
                  aria-invalid={
                    !!form.formState.errors[name as keyof StudentFormValues]
                  }
                />
                <ErrorText
                  message={
                    form.formState.errors[name as keyof StudentFormValues]
                      ?.message as string | undefined
                  }
                />
              </Field>
            ))}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save student"}
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

export function ProgrammeRegistryForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: {
  initialValues?: Partial<ProgrammeFormValues>;
  onSubmit: (values: ProgrammeFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<ProgrammeFormValues>({
    resolver: zodResolver(programmeSchema),
    defaultValues: {
      name: "",
      fee: "0",
      discount: "0",
      coupon: "",
      couponLimit: "",
      status: "ACTIVE",
      ...initialValues,
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialValues ? "Edit programme" : "Create programme"}
        </CardTitle>
        <CardDescription>
          Catalogue pricing is submitted as numeric values and returned as
          precise strings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {["name", "fee", "discount", "coupon", "couponLimit"].map(
              (name) => (
                <Field
                  key={name}
                  data-invalid={
                    !!form.formState.errors[name as keyof ProgrammeFormValues]
                  }
                >
                  <FieldLabel htmlFor={`registry-programme-${name}`}>
                    {name === "fee"
                      ? "Total Fee"
                      : name === "couponLimit"
                        ? "Coupon Usage Limit"
                        : name[0].toUpperCase() + name.slice(1)}
                  </FieldLabel>
                  <Input
                    id={`registry-programme-${name}`}
                    type={
                      name === "name" || name === "coupon" ? "text" : "number"
                    }
                    min={name === "name" || name === "coupon" ? undefined : "1"}
                    step={
                      name === "couponLimit"
                        ? "1"
                        : name === "name" || name === "coupon"
                          ? undefined
                          : "0.01"
                    }
                    {...form.register(name as keyof ProgrammeFormValues)}
                    aria-invalid={
                      !!form.formState.errors[name as keyof ProgrammeFormValues]
                    }
                  />
                  <ErrorText
                    message={
                      form.formState.errors[name as keyof ProgrammeFormValues]
                        ?.message as string | undefined
                    }
                  />
                </Field>
              ),
            )}
            <Field>
              <FieldLabel>Status</FieldLabel>
              <ToggleGroup
                aria-label="Programme status"
                value={[form.watch("status")]}
                onValueChange={(values) => {
                  const value = values.at(-1);
                  if (value)
                    form.setValue(
                      "status",
                      value as ProgrammeFormValues["status"],
                    );
                }}
                variant="outline"
                spacing={0}
              >
                {programmeStatuses.map((status) => (
                  <ToggleGroupItem key={status} value={status}>
                    {statusLabel(status)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save programme"}
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
