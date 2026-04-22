import { getRequiredUser } from "@/lib/auth";
import { trackProductEvent } from "@/lib/analytics";
import { jsonError } from "@/lib/http";
import { handleResumeUpload } from "@/server/services/resume-service";

export async function POST(request: Request) {
  let user;

  try {
    user = await getRequiredUser();
  } catch {
    return jsonError("Unauthorized.", 401);
  }

  const formData = await request.formData();
  const file = formData.get("resume");

  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a resume file before uploading.", code: "MISSING_FILE" }, { status: 400 });
  }

  try {
    const { resume, parsed } = await handleResumeUpload(user.id, file);
    await trackProductEvent({
      name: "resume_uploaded",
      userId: user.id,
      properties: {
        mimeType: file.type,
        skillCount: parsed.skills.length,
        experienceKeywordCount: parsed.experienceKeywords.length,
        preferredRoleCount: parsed.preferredRoles.length
      }
    });
    return Response.json({
      resumeId: resume.id,
      parsed
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload resume.";

    if (message.includes("Unsupported") || message.includes("supported")) {
      return Response.json({ error: "Please upload a PDF or DOCX resume.", code: "UNSUPPORTED_FILE" }, { status: 400 });
    }

    if (message.includes("5MB")) {
      return Response.json({ error: "Your resume is too large. Please upload a file smaller than 5MB.", code: "FILE_TOO_LARGE" }, { status: 400 });
    }

    if (message.includes("Unsupported file type")) {
      return Response.json({ error: "We could not upload that file. Please try a PDF or DOCX export.", code: "UPLOAD_FAILED" }, { status: 400 });
    }

    return Response.json(
      {
        error: "We could not read the text in your resume right now. Try another export or upload a clearer PDF or DOCX file.",
        code: "PARSING_FAILED"
      },
      { status: 400 }
    );
  }
}
