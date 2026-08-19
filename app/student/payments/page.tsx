import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/current-user"
import { PaymentPage } from "@/components/feature/payment/payment-page"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default async function StudentPaymentsPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 0) redirect("/login")

  return (
    <SidebarProvider>
      <AppSidebar userRole={user.role} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="me-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/student">📚 Student Portal</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>💳 My Payments</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col">
          <PaymentPage mode="student" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
