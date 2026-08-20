"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { logoutThunk } from "@/redux/features/auth/authThunk"
import { logout } from "@/redux/features/auth/authSlice"
import { useAppDispatch, useAppSelector } from "@/redux/hooks"

export default function LogoutPage() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const user = useAppSelector((state) => state.auth)

  useEffect(() => {
    let active = true;
    const userRole = user?.role;
    void dispatch(logoutThunk()).finally(() => {
      if (active) {
        dispatch(logout())
        if (userRole === 0) {
          router.replace("/student/login")
          return;
        }
        router.replace("/login")
      }
    })
    return () => { active = false }
  }, [dispatch, router])

  return <main className="flex min-h-svh items-center justify-center p-6"><p className="text-sm text-muted-foreground">Signing out...</p></main>
}