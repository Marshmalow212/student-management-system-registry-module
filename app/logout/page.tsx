"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { logoutThunk } from "@/redux/features/auth/authThunk"
import { logout } from "@/redux/features/auth/authSlice"
import { useAppDispatch } from "@/redux/hooks"

export default function LogoutPage() {
  const dispatch = useAppDispatch()
  const router = useRouter()

  useEffect(() => {
    let active = true
    void dispatch(logoutThunk()).finally(() => {
      if (active) {
        dispatch(logout())
        router.replace("/login")
      }
    })
    return () => { active = false }
  }, [dispatch, router])

  return <main className="flex min-h-svh items-center justify-center p-6"><p className="text-sm text-muted-foreground">Signing out...</p></main>
}