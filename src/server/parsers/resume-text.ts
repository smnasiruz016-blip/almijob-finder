import fs from "node:fs/promises";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export async function extractResumeText(filePath: string, mimeType: string) {
  const bytes = await fs.readFile(filePath);

  if (mimeType === "application/pdf") {
    const result = await pdfParse(bytes);
    return result.text;
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: bytes });
    return result.value;
  }

  throw new Error("Unsupported file type");
}
