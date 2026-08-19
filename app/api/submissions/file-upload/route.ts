import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import { LogEvent } from "@/lib/auth/log-events";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import { mkdir, writeFile } from "fs/promises";
import path from "path/posix";

export async function POST(request: Request): Promise<Response> {
  if (!request.body) {
    return errorResponse(
      "Empty Attachment: No Assessment Found",
      400,
      undefined,
      "NO_FILE_FOUND",
    );
  }
  const { error, user } = await requireAuth();
  if (error || !user) {
    return (
      error ?? errorResponse("Unauthorized", 401, undefined, "UNAUTHORIZED")
    );
  }

  const data = await request.formData();
  const file = data.get("assessmentFile") as File | null;
  if (!file) {
    return errorResponse(
      "No file provided in the request",
      400,
      undefined,
      "NO_FILE_PROVIDED",
    );
  }

  const extension = path.extname(file.name).toLowerCase();
  if (extension !== ".pdf" || file.type !== "application/pdf")
    return errorResponse(
      "Only PDF assessment files are supported",
      400,
      undefined,
      "INVALID_FILE_TYPE",
    );
  if (file.size <= 0)
    return errorResponse(
      "The uploaded file is empty",
      400,
      undefined,
      "EMPTY_FILE",
    );
  if (file.size > 50_000_000)
    return errorResponse(
      "The uploaded file exceeds the 50MB limit",
      400,
      undefined,
      "FILE_TOO_LARGE",
    );
  if (file.name.length > 255 || /[\0\\/]/.test(file.name))
    return errorResponse(
      "The uploaded filename is invalid",
      400,
      undefined,
      "INVALID_FILENAME",
    );

  const storedName = `${crypto.randomUUID()}${extension}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadDir, {
    recursive: true,
  });

  const filepath = path.join(uploadDir, storedName);

  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filepath, buffer);

  const publicPath = `/uploads/${storedName}`;

  await prisma.userLog.create({
    data: {
      userId: user.id,
      eventType: LogEvent.FILE_UPLOADED,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      metadata: {
        fileName: file.name,
        storedName,
        publicPath,
        size: buffer.length,
      },
    },
  });

  return jsonResponse({
    data: {
      fileName: file.name,
      file_path: publicPath,
      contentType: file.type,
      sizeBytes: buffer.length,
    },
  });
}
