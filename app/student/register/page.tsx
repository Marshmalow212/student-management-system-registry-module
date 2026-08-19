import { StudentRegistrationAction } from "@/components/feature/student-auth/student-registration-action";

export default function StudentRegisterPage() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <StudentRegistrationAction />
      </div>
    </main>
  );
}
