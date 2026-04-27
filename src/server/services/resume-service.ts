import { MAX_UPLOAD_SIZE_BYTES, SUPPORTED_UPLOAD_MIME_TYPES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { parseResumeText } from "@/server/parsers/resume-parser";
import { extractResumeText } from "@/server/parsers/resume-text";
import { saveUploadedFile } from "@/server/storage/file-storage";

export async function handleResumeUpload(userId: string, file: File) {
  if (!SUPPORTED_UPLOAD_MIME_TYPES.includes(file.type)) {
    throw new Error("Only PDF and DOCX resume uploads are supported.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Resume file must be 5MB or smaller.");
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const { relativePath, fullPath } = await saveUploadedFile(userId, file.name, bytes);
    const extractedText = await extractResumeText(fullPath, file.type);
    const parsed = parseResumeText(extractedText);

    const resume = await prisma.resume.create({
      data: {
        userId,
        originalFilename: file.name,
        storagePath: relativePath,
        mimeType: file.type,
        extractedText,
        parsedName: parsed.name,
        parsedEmail: parsed.email,
        parsedPhone: parsed.phone,
        skills: parsed.skills,
        experienceKeywords: parsed.experienceKeywords,
        educationKeywords: parsed.educationKeywords,
        preferredRoles: parsed.preferredRoles
      }
    });

    log("info", "Resume uploaded", {
      userId,
      resumeId: resume.id,
      filename: file.name
    });

    return {
      resume,
      parsed
    };
  } catch (error) {
    log("error", "Resume upload failed", {
      userId,
      filename: file.name,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
}

export async function getLatestParsedResume(userId: string) {
  const resume = await prisma.resume.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  if (!resume) {
    return null;
  }

  return {
    name: resume.parsedName ?? undefined,
    email: resume.parsedEmail ?? undefined,
    phone: resume.parsedPhone ?? undefined,
    skills: resume.skills,
    experienceKeywords: resume.experienceKeywords,
    educationKeywords: resume.educationKeywords,
    preferredRoles: resume.preferredRoles,
    rawText: resume.extractedText ?? ""
  };
}
