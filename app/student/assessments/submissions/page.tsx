"use client";

import { AssessmentSubmissionForm } from "@/components/forms/assessment-submission-form";
import { AxiosInstance } from "@/lib/axios-client";

export default function StudentAssessmentSubmissionPage() {
  const handleSubmit = async (data: any) => {
    // Handle form submission logic here
    const formData = new FormData();
    formData.append("assessmentFile", data.assessmentFile);
    console.log("Form submitted with data:", data);
    AxiosInstance.post("/api/submissions/file-upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
      .then((response) => {
        console.log("Submission successful:", response.data);
      })
      .catch((error) => {
        console.error("Submission failed:", error);
      });
  };

  const handleCancel = () => {
    // Handle cancel action here
    console.log("Form submission canceled");
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Submit Assessment</h1>
      <AssessmentSubmissionForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={false}
        error={null}
      />
    </div>
  );
}
