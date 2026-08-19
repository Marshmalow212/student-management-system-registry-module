"use client";

import { LoginForm } from "@/components/login-form";
import { useAppDispatch } from "@/redux/hooks";
import { toast } from "@/components/ui/toast";
import { loginThunk } from "@/redux/features/auth/authThunk";
import { useRouter } from "next/navigation";

function LoginFormAction(): React.JSX.Element {
  const router = useRouter();
  const dispatch = useAppDispatch();
  async function handleLogin(data: Record<string, string>) {
    try {
      const user = await dispatch(
        loginThunk({ email: data.email, password: data.password }),
      ).unwrap();
      toast.add({
        title: "Success",
        description: `Authenticated as ${user.name}.`,
      });
      router.push("/dashboard");
    } catch (error) {
      toast.add({ title: "Login failed", description: getErrorMessage(error) });
    }
  }

  return (
    <>
      <LoginForm loginHandler={handleLogin} />
    </>
  );
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "details" in error) {
    const details = (error as { details?: Record<string, string[]> }).details;
    const firstDetail = details && Object.values(details)[0]?.[0];
    if (firstDetail) return firstDetail;
  }
  if (error && typeof error === "object" && "error" in error) {
    return String((error as { error?: string }).error || "Request failed");
  }
  return "Request failed. Please try again.";
}

export { LoginFormAction };
