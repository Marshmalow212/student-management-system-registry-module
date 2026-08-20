"use client";

import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import {
  StudentRegistrationForm,
  type StudentRegistrationValues,
} from "@/components/ui/forms/student-account-registration-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectAuth } from "@/redux/features/auth/authSlice";
import { studentRegisterThunk } from "@/redux/features/auth/authThunk";
import { studentAuthErrorMessage } from "./student-auth-messages";

export function StudentRegistrationAction() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector(selectAuth);
  async function onSubmit(values: StudentRegistrationValues) {
    try {
      const user = await dispatch(studentRegisterThunk(values)).unwrap();
      toast.add({
        title: "Registration created",
        description: "Enter the OTP sent to your email.",
      });
      router.push(`/student/verify?email=${encodeURIComponent(user.email)}`);
    } catch (error) {
      toast.add({
        title: "Registration failed",
        description: studentAuthErrorMessage(error),
      });
    }
  }
  return (
    <StudentRegistrationForm
      onSubmit={onSubmit}
      isLoading={auth.is_loading}
      error={auth.error}
    />
  );
}
