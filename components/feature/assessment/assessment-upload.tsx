"use client";

import {
  Attachment,
  AttachmentActions,
  AttachmentAction,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import {
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  FileWarningIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { uploadAssessmentFile } from "@/redux/features/assessment/assessmentThunk";
import { clearUploadedFile } from "@/redux/features/assessment/assessmentSlice";
export default function AssessmentUploader({
  handleUpload,
}: {
  handleUpload?: any;
}) {
  const dispatch = useAppDispatch();
  const assessmentState = useAppSelector((state) => state.assessment);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "processing" | undefined>("idle");
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file: File | undefined = event.target.files?.[0];
    console.log("Selected file:", file);
    toast.add({
      title: "File selected",
      description: file ? `You selected: ${file.name}` : "No file selected",
      type: "default",
    });
    if (file) {
      setUploadStatus("uploading");
    }

    dispatch(uploadAssessmentFile(file)).unwrap()
      .then((action) => {
        if (uploadAssessmentFile.fulfilled.match(action)) {
          setUploadStatus("done");
          toast.add({
            title: "File uploaded",
            description: `File uploaded successfully: ${action.payload.fileName}`,
            type: "success",
          });
          console.log("Upload successful:", action.payload);
        }})
        .catch((error) => {
          setUploadStatus("idle");
          toast.add({
            title: "Upload failed",
            description: `File upload failed: ${error.message}`,
            type: "destructive",
          });
        })
        .finally(() => {
          setUploadStatus("idle");
          toast.add({
            title: "Submit the assessment if its ready.",
            description: "File upload process completed.",
            type: "default",
          });
        });
    }

    function clearFileInput(event: any) {
      event.target.value = "";
      setUploadStatus("idle");
      dispatch(clearUploadedFile());
      toast.add({
        title: "File Upload Ready!",
        description: "You can select a new file to upload.",
        type: "Secondary",
      });

    }

  return (
    <>
      <div className="mx-auto flex w-full max-w-sm flex-col gap-2 py-12">
        <Attachment state={uploadStatus} className="w-full">
          <AttachmentMedia>
            <FileTextIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{assessmentState?.uploadedFileName || "No file selected"}</AttachmentTitle>
            <AttachmentDescription>{uploadStatus === "uploading" ? "Uploading..." : uploadStatus === "done" ? "Upload complete" : "Ready to upload"}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove selected-file.pdf" onClick={clearFileInput}>
              <XIcon />

            </AttachmentAction>
          </AttachmentActions>
          <AttachmentTrigger
            render={() => (
              <Input
                type="file"
                className=""
                aria-label="Upload Assessment"
                onChange={handleFileChange}
              />
            )}
          ></AttachmentTrigger>
        </Attachment>
      </div>
    </>
  );
}
