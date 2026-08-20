"use client";

import { useEffect } from "react";
import { UserRole } from "@/lib/auth/roles";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchStaffDashboard } from "@/redux/features/dashboard/staffDashboardThunk";
import { fetchRegistrarDashboard } from "@/redux/features/dashboard/registrarDashboardThunk";
import { DashboardSectionCard } from "@/components/feature/dashboard/dashboard-section-card";

export function DashboardSummary({ role }: { role: number }) {
  const dispatch = useAppDispatch();
  const staff = useAppSelector((state) => state.staffDashboard);
  const registrar = useAppSelector((state) => state.registrarDashboard);
  const isStaff = role === UserRole.STAFF;
  const dashboard = isStaff ? staff : registrar;

  useEffect(() => {
    if (isStaff) {
      void dispatch(fetchStaffDashboard());
    } else if (role >= UserRole.REGISTRAR) {
      void dispatch(fetchRegistrarDashboard());
    }
  }, [dispatch, isStaff, role]);

  const cards = isStaff && staff.summary
    ? [
        { title: "Assessments You Created", value: staff.summary.assessmentCount, helper: "Assessments authored in your workspace" },
        { title: "Student Submissions", value: staff.summary.submissionCount, helper: "Submissions received for your assessments" },
        { title: "Published Assessment Results", value: staff.summary.publishedAssessmentCount, helper: "Assessments with published results" },
        { title: "Assessments Awaiting Results", value: staff.summary.pendingResultAssessmentCount, helper: "Closed assessments pending result publication" },
      ]
    : !isStaff && registrar.summary
      ? [
          { title: "Total Students", value: registrar.summary.totalStudentCount, helper: "Students in the active registry" },
          { title: "Currently Enrolled Students", value: registrar.summary.enrolledStudentCount, helper: "Students with an active enrolment" },
          { title: "Completed Students", value: registrar.summary.completedStudentCount, helper: "Students who completed their programme" },
          { title: "Deferred Students", value: registrar.summary.deferredStudentCount, helper: "Students with deferred status" },
          { title: "Withdrawn Students", value: registrar.summary.withdrawnStudentCount, helper: "Students with withdrawn status" },
          { title: "Students With Overdue Payments", value: registrar.summary.overduePaymentStudentCount, helper: "Students flagged with an overdue balance" },
        ]
      : [];

  if (dashboard.error) {
    return <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{dashboard.error}</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.length > 0
        ? cards.map((card) => <DashboardSectionCard key={card.title} {...card} />)
        : Array.from({ length: isStaff ? 4 : 6 }).map((_, index) => <DashboardSectionCard key={index} title="" value="" helper="" isLoading />)}
    </div>
  );
}
