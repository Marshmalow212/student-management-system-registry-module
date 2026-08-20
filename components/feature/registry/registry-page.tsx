"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  RegistryDataTable,
  type RegistryRow,
} from "@/components/feature/tables/registry-data-table";
import {
  ProgrammeRegistryForm,
  type ProgrammeFormValues,
} from "@/components/ui/forms/programme-registry-form";
import {
  StudentRegistryRegistrationForm,
  type StudentRegistrationFormValues,
} from "@/components/ui/forms/student-registry-registration-form";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { clearRegistration } from "@/redux/features/registration/registrationSlice";
import { registerStudent } from "@/redux/features/registration/registrationThunk";
import { clearRegistryDetail } from "@/redux/features/registry/registrySlice";
import {
  deleteRegistryItem,
  fetchRegistry,
  fetchRegistryDetail,
  saveRegistryItem,
  type RegistryKind,
} from "@/redux/features/registry/registryThunk";

import { STUDENT_STATUS_LABEL } from "@/lib/student-status";

type RegistryItem = Record<string, unknown> & { id: number; status: string };
function label(value: unknown) {
  return value == null || value === "" ? "-" : String(value);
}
function statusLabel(value: number | string) {
  if (typeof value === "string") {
    return value;
  }
  return STUDENT_STATUS_LABEL[
    value as keyof typeof STUDENT_STATUS_LABEL
  ] ?? String(value);
}
const detailLabel: Record<string, string> = {
  studentUid: "Student ID",
  fullName: "Full Name",
  academicYear: "Academic Year",
  programmeId: "Programme",
  enrolledYear: "Enrollment Year",
  fee: "Total Fee",
  couponLimit: "Coupon Usage Limit",
  status: "Status",
  hasOverdueBalance: "Balance Overdue",
  createdAt: "Created On",
  updatedAt: "Last Updated",
  couponUsed: "Coupon Usage Count",
  dateOfBirth: "Birth Date",
  email: "Email",
};

export function RegistryPage({
  kind,
  role,
}: {
  kind: RegistryKind;
  role: number;
}) {
  const dispatch = useAppDispatch();
  const cache = useAppSelector((state) => state.registry[kind]);
  const programmes = useAppSelector((state) => state.registry.programmes.items)
    .filter((item) => item.status === "ACTIVE" && typeof item.name === "string")
    .map((item) => ({ id: item.id, name: item.name as string }));
  const { isLoading, isSaving, error } = useAppSelector(
    (state) => state.registry,
  );
  const registration = useAppSelector((state) => state.registration);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState(kind === "students" ? "fullName" : "name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<RegistryItem | null>(null);
  const canWrite = role >= 2;
  const canDelete = role >= 3;
  const query = {
    kind,
    params: {
      page: 1,
      pageSize: 20,
      search: search || undefined,
      status: status === "ALL" ? undefined : status,
      sort,
      order,
    },
  };
  const items = cache.items;

  useEffect(() => {
    const timer = window.setTimeout(
      () => void dispatch(fetchRegistry(query)),
      200,
    );
    return () => window.clearTimeout(timer);
  }, [dispatch, kind, search, status, sort, order]);
  useEffect(() => {
    if (kind === "students")
      void dispatch(
        fetchRegistry({
          kind: "programmes",
          params: {
            page: 1,
            pageSize: 100,
            status: "ACTIVE",
            sort: "name",
            order: "asc",
          },
        }),
      );
  }, [dispatch, kind]);
  function closeForm() {
    setFormOpen(false);
    dispatch(clearRegistration());
  }

  const getDetailValue = (key: string, value: any): string | null => {
    if (key === "status") {
      if (typeof value === "number") {
        return statusLabel(value);
      }
      return String(value);
    }

    if (key === "programmeId" && typeof value === "number") {
      return ` (${label(programmes.find((p) => p.id === value)?.name ?? "")})`;
    }


    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (key === "createdAt" || key === "updatedAt" || key === "deletedAt" || key === "dateOfBirth") {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          if (key === "dateOfBirth") {
            return date.toLocaleDateString();
          }
          return date.toLocaleString();
        }
      } catch (e: any) {
       return value;
      }
    }

    if (key === "fee" || key === "discount") {
      return `$ ${value}`;
    }

    if (value === null || value === undefined) {
      return "-";
    }

    return value;
  };
  async function register(values: StudentRegistrationFormValues) {
    await dispatch(
      registerStudent({
        ...values,
        programmeId: Number(values.programmeId),
        dateOfBirth: values.dateOfBirth || null,
      }),
    ).unwrap();
    await dispatch(fetchRegistry(query)).unwrap();
  }
  async function saveProgramme(values: ProgrammeFormValues) {
    await dispatch(
      saveRegistryItem({
        kind,
        data: {
          ...values,
          fee: Number(values.fee),
          discount: Number(values.discount),
          coupon: values.coupon || null,
          couponLimit: values.couponLimit ? Number(values.couponLimit) : null,
        },
        reload: query,
      }),
    ).unwrap();
    setFormOpen(false);
  }
  async function view(item: RegistryItem) {
    await dispatch(fetchRegistryDetail({ kind, id: item.id })).unwrap();
    setDetailOpen(true);
  }
  async function archive(item: RegistryItem) {
    await dispatch(deleteRegistryItem({ kind, id: item.id, reload: query }));
    setArchiveTarget(null);
  }
  const registrationStudent = registration.registration?.student ?? {};
  const registrationEnrollment = registration.registration?.enrollment ?? {};
  const columns =
    kind === "students"
      ? ["Student ID", "Full Name", "Email", "Programme", "Status"]
      : ["Programme", "Total Fee", "Discount", "Status"];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8 h-full">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Staff workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {kind === "students" ? "Student registry" : "Programme registry"}
          </h1>
          <p className="text-muted-foreground">
            Search and maintain registry records.
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setFormOpen(true)}>
            {kind === "students" ? "Register student" : "Create programme"}
          </Button>
        )}
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <Card className="flex flex-col gap-2 overflow-auto h-full">
        <CardHeader>
          <CardTitle>
            {kind === "students" ? "Students" : "Programmes"}
          </CardTitle>
          <CardDescription>
            {cache.pagination?.total ?? 0} active record
            {cache.pagination?.total === 1 ? "" : "s"}
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label={`Search ${kind}`}
              placeholder="Search..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-sm"
            />
            <Select
              value={status}
              onValueChange={(value) => value && setStatus(value)}
            >
              <SelectTrigger aria-label="Filter by status" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {(kind === "students"
                  ? [
                      "ACTIVE",
                      "INACTIVE",
                      "GRADUATED",
                      "SUSPENDED",
                      "WITHDRAWN",
                    ]
                  : ["ACTIVE", "INACTIVE", "ARCHIVED"]
                ).map((value) => (
                  <SelectItem key={value} value={value}>
                    {statusLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(value) => value && setSort(value)}
            >
              <SelectTrigger aria-label="Sort records" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(kind === "students"
                  ? [
                      ["studentUid", "Student ID"],
                      ["fullName", "Full Name"],
                      ["email", "Email"],
                      ["academicYear", "Academic Year"],
                    ]
                  : [
                      ["name", "Programme"],
                      ["fee", "Total Fee"],
                      ["createdAt", "Created"],
                    ]
                ).map(([value, text]) => (
                  <SelectItem key={value} value={value}>
                    {text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
            >
              {order === "asc" ? "Ascending" : "Descending"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-auto">
          {isLoading ? (
            <div className="flex flex-col gap-3 h-full">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length > 0 ? (
            <RegistryDataTable
              data={items as unknown as RegistryRow[]}
              isLoading={isLoading}
              kind={kind}
              canDelete={canDelete}
              onView={(row) => view(row as unknown as RegistryItem)}
              onArchive={(row) => setArchiveTarget(row as unknown as RegistryItem)}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No students registered yet.
            </p>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={formOpen}
        onOpenChange={(open) => (open ? setFormOpen(true) : closeForm())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {kind === "students" ? "Register student" : "Create programme"}
            </DialogTitle>
            <DialogDescription>
              {kind === "students"
                ? "Identity and programme only; the academic year and Student ID are generated."
                : "Add an active programme to the catalogue."}
            </DialogDescription>
          </DialogHeader>
          {kind === "students" ? (
            <StudentRegistryRegistrationForm
              programmes={programmes}
              onSubmit={register}
              onCancel={closeForm}
              isLoading={registration.isSaving}
              error={registration.error}
            />
          ) : (
            <ProgrammeRegistryForm
              onSubmit={saveProgramme}
              onCancel={closeForm}
              isLoading={isSaving}
              error={error}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!registration.registration}
        onOpenChange={(open) => !open && closeForm()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student registered</DialogTitle>
            <DialogDescription>
              Registration and Enrollment were created successfully.
            </DialogDescription>
          </DialogHeader>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Student ID</dt>
              <dd>{label(registrationStudent.studentUid)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Academic Year</dt>
              <dd>{label(registrationStudent.academicYear)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Programme</dt>
              <dd>
                {label(
                  programmes.find(
                    (p) => p.id === registrationStudent.programmeId,
                  )?.name ?? "",
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                Enrollment reference
              </dt>
              <dd>{label(registrationEnrollment.reference)}</dd>
            </div>
          </dl>
          <div className="flex justify-end">
            <Button onClick={closeForm}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) dispatch(clearRegistryDetail(kind));
        }}
      >
        <DialogContent >
          <DialogHeader>
            <DialogTitle>Record detail</DialogTitle>
            <DialogDescription>
              Safe fields returned by the registry API.
            </DialogDescription>
          </DialogHeader>
          <dl className="grid gap-5 sm:grid-cols-2 w-full" >
            {Object.entries(cache.detail ?? {})
              .filter(
                ([key]) =>
                  !["programme", "deletedAt", "id", "userId"].includes(key),
              )
              .map(([key, value]) => (
                <div key={key} className="mx-3">
                  <dt className="text-sm text-muted-foreground">
                    {detailLabel[key] ?? key}
                  </dt>
                  <dd>
                    {getDetailValue(key, value)}
                  </dd>
                </div>
              ))}
          </dl>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDetailOpen(false);
                dispatch(clearRegistryDetail(kind));
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive record?"
        description={
          archiveTarget
            ? `Archive ${label(archiveTarget.name ?? archiveTarget.fullName)}? This removes it from active registry results.`
            : "Confirm this registry action."
        }
        confirmLabel="Archive"
        destructive
        isLoading={isSaving}
        onConfirm={() => archiveTarget && void archive(archiveTarget)}
      />
    </main>
  );
}
