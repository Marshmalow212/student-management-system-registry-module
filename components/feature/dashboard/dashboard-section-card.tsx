"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSectionCard({ title, value, helper, isLoading }: {
  title: string;
  value: string | number;
  helper: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        {isLoading ? <Skeleton className="h-4 w-36" /> : <CardDescription>{title}</CardDescription>}
        {isLoading ? <Skeleton className="h-8 w-20" /> : <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>}
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-4 w-40" /> : <p className="text-sm text-muted-foreground">{helper}</p>}
      </CardContent>
    </Card>
  );
}
