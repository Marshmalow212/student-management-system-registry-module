"use client";

import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import {
  StudentLoginForm,
  type StudentLoginValues,
} from "@/components/forms/student-login-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectAuth } from "@/redux/features/auth/authSlice";
import { studentLoginThunk } from "@/redux/features/auth/authThunk";
import {
  studentAuthErrorCode,
  studentAuthErrorMessage,
} from "./student-auth-messages";

export function StudentLoginAction() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector(selectAuth);
  async function onSubmit(values: StudentLoginValues) {
    try {
      const user = await dispatch(studentLoginThunk(values)).unwrap();
      toast.add({
        title: "Welcome back",
        description: `Signed in as ${user.name}.`,
      });
      router.push("/student/dashboard");
    } catch (error) {
      toast.add({
        title: "Sign-in failed",
        description: studentAuthErrorMessage(error),
      });
      if (studentAuthErrorCode(error) === "ACCOUNT_UNVERIFIED")
        router.push(
          `/student/verify?email=${encodeURIComponent(values.email)}`,
        );
    }
  }
  return (
    <StudentLoginForm
      onSubmit={onSubmit}
      isLoading={auth.is_loading}
      error={auth.error}
    />
  );
}
