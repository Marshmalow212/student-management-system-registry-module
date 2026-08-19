"use client";

import * as React from "react";

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LayoutBottomIcon,
  DashboardSquare01Icon,
  StudentIcon,
  BookOpen01Icon,
  UserGroupIcon,
  FileAttachmentIcon,
  ChartHistogramIcon,
  DocumentValidationIcon,
  Certificate01Icon,
  MoneyBag02Icon,
} from "@hugeicons/core-free-icons";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export type NavigationItem = {
  title: string;
  url: string;
  icon: typeof DashboardSquare01Icon;
  items: { title: string; url: string; icon: typeof DashboardSquare01Icon }[];
};

const dashboardItem = {
  title: "Dashboard",
  url: "/dashboard",
  icon: DashboardSquare01Icon,
  items: [],
};

export function getNavigationForRole(role: number): {
  navMain: NavigationItem[];
  portalTitle: string;
} {
  if (role === 0) {
    return {
      portalTitle: "Student Portal",
      navMain: [
        {
          title: "Dashboard",
          url: "/student/dashboard",
          icon: DashboardSquare01Icon,
          items: [],
        },
        {
          title: "Academic",
          url: "#",
          icon: DocumentValidationIcon,
          items: [
            {
              title: "My Assessments",
              url: "/student/assessments",
              icon: FileAttachmentIcon,
            },
            {
              title: "My Results",
              url: "/student/results",
              icon: ChartHistogramIcon,
            },
            {
              title: "My Transcript",
              url: "/student/transcript",
              icon: Certificate01Icon,
            },
          ],
        },
        {
          title: "Financial",
          url: "#",
          icon: MoneyBag02Icon,
          items: [
            {
              title: "My Payments",
              url: "/student/payments",
              icon: MoneyBag02Icon,
            },
          ],
        },
      ],
    };
  }

  if (role === 1) {
    return {
      portalTitle: "Staff Portal",
      navMain: [
        dashboardItem,
        {
          title: "Academic",
          url: "#",
          icon: DocumentValidationIcon,
          items: [
            {
              title: "Assessments",
              url: "/dashboard/assessments",
              icon: FileAttachmentIcon,
            },
          ],
        },
      ],
    };
  }

  if (role === 2) {
    return {
      portalTitle: "Registrar Portal",
      navMain: [
        dashboardItem,
        {
          title: "Registration",
          url: "#",
          icon: UserGroupIcon,
          items: [
            {
              title: "Students",
              url: "/dashboard/students",
              icon: StudentIcon,
            },
            {
              title: "Programmes",
              url: "/dashboard/programmes",
              icon: BookOpen01Icon,
            },
          ],
        },
        {
          title: "Financial",
          url: "#",
          icon: MoneyBag02Icon,
          items: [
            {
              title: "Enrollment",
              url: "/dashboard/enrollments",
              icon: FileAttachmentIcon,
            },
            {
              title: "Payments",
              url: "/dashboard/payments",
              icon: MoneyBag02Icon,
            },
          ],
        },
      ],
    };
  }

  return {
    portalTitle: "Admin Portal",
    navMain: [
      dashboardItem,
      {
        title: "Registration",
        url: "#",
        icon: UserGroupIcon,
        items: [
          { title: "Students", url: "/dashboard/students", icon: StudentIcon },
          {
            title: "Programmes",
            url: "/dashboard/programmes",
            icon: BookOpen01Icon,
          },
        ],
      },
      {
        title: "Financial",
        url: "#",
        icon: MoneyBag02Icon,
        items: [
          {
            title: "Enrollment",
            url: "/dashboard/enrollments",
            icon: FileAttachmentIcon,
          },
          {
            title: "Payments",
            url: "/dashboard/payments",
            icon: MoneyBag02Icon,
          },
        ],
      },
      {
        title: "Academic",
        url: "#",
        icon: DocumentValidationIcon,
        items: [
          {
            title: "Assessments",
            url: "/dashboard/assessments",
            icon: FileAttachmentIcon,
          },
          {
            title: "Reports",
            url: "/dashboard/reports/results",
            icon: ChartHistogramIcon,
          },
        ],
      },
      {
        title: "Administration",
        url: "#",
        icon: UserGroupIcon,
        items: [
          {
            title: "Account management",
            url: "/dashboard/accounts",
            icon: UserGroupIcon,
          },
        ],
      },
    ],
  };
}

export function AppSidebar({
  userRole,
  ...props
}: React.ComponentProps<typeof Sidebar> & { userRole?: number }) {
  const { navMain, portalTitle } = getNavigationForRole(userRole ?? 0);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-row justify-between">
              <div className="w-full">
                <SidebarMenuButton
                  size="lg"
                  render={
                    <a
                      href={
                        (userRole ?? 0) >= 1
                          ? "/dashboard"
                          : "/student/dashboard"
                      }
                    >
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <HugeiconsIcon
                          icon={LayoutBottomIcon}
                          strokeWidth={2}
                          className="size-4"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 leading-none">
                        <span className="font-medium">SMS</span>
                        <span className="text-xs">{portalTitle}</span>
                      </div>
                    </a>
                  }
                />
              </div>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <div className="flex size-8 items-center justify-center">
                      <ChevronsUpDown className="ml-auto size-4" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                    side="bottom"
                    align="end"
                    sideOffset={4}
                  >
                    <DropdownMenuItem>
                      <Link href="/logout" className="w-full">
                      <div className="flex w-full items-center justify-start gap-2">
                        <LogOut />
                        Log out
                      </div>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<a href={item.url} className="font-medium" />}
                >
                  {item.title}
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton render={<a href={subItem.url} />}>
                          {subItem.title}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
