"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { StudentOtpForm } from "@/components/forms/student-otp-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectAuth } from "@/redux/features/auth/authSlice";
import {
  studentResendThunk,
  studentVerifyThunk,
} from "@/redux/features/auth/authThunk";
import { studentAuthErrorMessage } from "./student-auth-messages";

export function StudentVerifyAction() {
  const email = useSearchParams().get("email")?.trim().toLowerCase() ?? "";
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector(selectAuth);
  async function onVerify(values: { otp: string }) {
    try {
      await dispatch(studentVerifyThunk({ email, otp: values.otp })).unwrap();
      toast.add({
        title: "Account verified",
        description: "You are now signed in.",
      });
      router.push("/student/dashboard");
    } catch (error) {
      toast.add({
        title: "Verification failed",
        description: studentAuthErrorMessage(error),
      });
    }
  }
  async function onResend() {
    try {
      const message = await dispatch(studentResendThunk({ email })).unwrap();
      toast.add({ title: "OTP resent", description: message });
    } catch (error) {
      toast.add({
        title: "Could not resend OTP",
        description: studentAuthErrorMessage(error),
      });
    }
  }
  if (!email)
    return (
      <p role="alert" className="text-sm text-destructive">
        A registration email is required.{" "}
        <a href="/student/register" className="underline">
          Register again
        </a>
        .
      </p>
    );
  return (
    <StudentOtpForm
      email={email}
      onVerify={onVerify}
      onResend={onResend}
      isLoading={auth.is_loading}
      error={auth.error}
    />
  );
}
