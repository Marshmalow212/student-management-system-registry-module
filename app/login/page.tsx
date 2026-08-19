import { LoginForm } from "@/components/login-form";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { login, logout, check_data } from "@/redux/features/auth/authSlice";
import { Suspense } from "react";
import {LoginFormAction} from "@/components/feature/auth/login-form-action";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense>
          <LoginFormAction />
        </Suspense>
      </div>
    </div>
  )
}
