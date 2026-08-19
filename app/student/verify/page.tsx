import { Suspense } from "react";
import { StudentVerifyAction } from "@/components/feature/student-auth/student-verify-action";

export default function StudentVerifyPage() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Suspense fallback={<p>Loading verification...</p>}>
          <StudentVerifyAction />
        </Suspense>
      </div>
    </main>
  );
}
