import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              Account creation is managed by an administrator
            </CardTitle>
            <CardDescription>
              Contact an administrator to create a staff, registrar, or admin
              account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a className="text-sm underline" href="/login">
              Sign in
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
