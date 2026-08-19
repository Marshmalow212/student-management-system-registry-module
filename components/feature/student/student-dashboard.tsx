"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchStudentDashboard } from "@/redux/features/student/studentDashboardThunk";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StudentDashboardSummary() {
  const dispatch = useAppDispatch();
  const { summary, isLoading, error } = useAppSelector(
    (state) => state.studentDashboard,
  );

  useEffect(() => {
    void dispatch(fetchStudentDashboard());
  }, [dispatch]);

  if (isLoading || !summary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  const cards = [
    {
      label: "Outstanding Balance",
      value: `$${Number(summary.outstandingBalance).toFixed(2)}`,
      helper: "Due for upcoming fees",
    },
    {
      label: "Number of submissions",
      value: String(summary.submissionCount),
      helper: "Total submitted assignments",
    },
    {
      label: "Number of overdue submissions",
      value: String(summary.overdueSubmissionCount),
      helper: "Needs attention before closeout",
    },
    {
      label: "Last Submission Result Grade",
      value: summary.lastResultGrade ?? "N/A",
      helper: "Most recent assessment result",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {card.value}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{card.helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
