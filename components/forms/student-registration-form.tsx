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

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name is too long"),
  email: z.string().trim().email("Enter a valid email"),
  studentId: z
    .string()
    .trim()
    .min(1, "Student ID is required")
    .max(64, "Student ID is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export type StudentRegistrationValues = z.infer<typeof schema>;

export function StudentRegistrationForm({
  onSubmit,
  isLoading,
  error,
}: {
  onSubmit: (values: StudentRegistrationValues) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}) {
  const form = useForm<StudentRegistrationValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", studentId: "", password: "" },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your student account</CardTitle>
        <CardDescription>
          Register with your student ID, then verify the OTP sent to your email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {(["name", "email", "studentId", "password"] as const).map(
              (name) => (
                <Field key={name} data-invalid={!!form.formState.errors[name]}>
                  <FieldLabel htmlFor={`student-${name}`}>
                    {name === "studentId"
                      ? "Student ID"
                      : name === "name"
                        ? "Full name"
                        : name[0].toUpperCase() + name.slice(1)}
                  </FieldLabel>
                  <Input
                    id={`student-${name}`}
                    type={
                      name === "password"
                        ? "password"
                        : name === "email"
                          ? "email"
                          : "text"
                    }
                    autoComplete={
                      name === "password"
                        ? "new-password"
                        : name === "email"
                          ? "email"
                          : "off"
                    }
                    {...form.register(name)}
                    aria-invalid={!!form.formState.errors[name]}
                  />
                  {form.formState.errors[name] && (
                    <FieldDescription role="alert">
                      {form.formState.errors[name]?.message}
                    </FieldDescription>
                  )}
                </Field>
              ),
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={isLoading || form.formState.isSubmitting}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
            <FieldDescription className="text-center">
              Already registered?{" "}
              <a href="/student/login" className="underline">
                Sign in
              </a>
            </FieldDescription>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
