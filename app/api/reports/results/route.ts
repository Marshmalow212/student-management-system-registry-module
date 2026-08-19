import { requireAssessmentStaff } from "@/lib/auth-guards";
import { errorResponse } from "@/lib/api-utils";
import { GET as getResults } from "@/app/api/results/route";

export async function GET(request: Request): Promise<Response> {
  const { error, user } = await requireAssessmentStaff();
  if (error || !user)
    return error ?? errorResponse("Forbidden", 403, undefined, "FORBIDDEN");
  return getResults(request);
}
