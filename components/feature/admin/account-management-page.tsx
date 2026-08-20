"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { createStaffAccountThunk } from "@/redux/features/auth/authThunk";
import { fetchUsers } from "@/redux/features/admin/usersThunk";
import {
  StaffAccountForm,
  type StaffAccountFormValues,
} from "@/components/ui/forms/staff-account-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountsDataTable } from "@/components/feature/tables/accounts-data-table";
import { toast } from "@/components/ui/toast";

function roleValue(value: StaffAccountFormValues["role"]) {
  return Number(value) as 1 | 2 | 3;
}

const ROLE_OPTIONS = [
  { value: "1", label: "Staff" },
  { value: "2", label: "Registrar" },
  { value: "3", label: "Admin" },
];

export function AccountManagementPage() {
  const dispatch = useAppDispatch();
  const { is_loading: isLoading, error } = useAppSelector(
    (state) => state.auth,
  );
  const {
    items,
    isLoading: usersLoading,
    error: usersError,
  } = useAppSelector((state) => state.adminUsers);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    void dispatch(
      fetchUsers(roleFilter === "ALL" ? undefined : Number(roleFilter)),
    );
  }, [dispatch, roleFilter]);

  async function createAccount(values: StaffAccountFormValues) {
    try {
      const user = await dispatch(
        createStaffAccountThunk({ ...values, role: roleValue(values.role) }),
      ).unwrap();
      toast.add({
        title: "Account created",
        description: `${user.name} can now sign in as ${user.role === 1 ? "Staff" : user.role === 2 ? "Registrar" : "Admin"}.`,
      });
      setFormOpen(false);
      await dispatch(
        fetchUsers(roleFilter === "ALL" ? undefined : Number(roleFilter)),
      ).unwrap();
    } catch {
      // The auth slice exposes the API error to the form.
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Admin workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Account management
          </h1>
          <p className="text-muted-foreground">
            Create Staff, Registrar, and Admin accounts.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Create account</Button>
      </header>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create account</DialogTitle>
            <DialogDescription>
              Only administrators can create operational accounts.
            </DialogDescription>
          </DialogHeader>
          <StaffAccountForm
            onSubmit={createAccount}
            isLoading={isLoading}
            error={error}
          />
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader>
          <CardTitle>User accounts</CardTitle>
          <CardDescription>
            {items.length} account{items.length === 1 ? "" : "s"}
          </CardDescription>
          <Select
            items={ROLE_OPTIONS}
            value={roleFilter}
            onValueChange={(value) => value && setRoleFilter(value)}
          >
            <SelectTrigger aria-label="Filter users by role" className="w-48">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="1">Staff</SelectItem>
              <SelectItem value="2">Registrar</SelectItem>
              <SelectItem value="3">Admin</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {usersError && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {usersError}
            </p>
          )}
          {usersLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <AccountsDataTable data={items} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
