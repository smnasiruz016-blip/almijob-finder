import fs from "node:fs/promises";
import path from "node:path";
import { slugify } from "@/lib/utils";

const uploadRoot = path.join(process.cwd(), "storage", "uploads");

export async function ensureUploadRoot() {
  await fs.mkdir(uploadRoot, { recursive: true });
}

export async function saveUploadedFile(userId: string, filename: string, bytes: Buffer) {
  await ensureUploadRoot();

  const safeName = slugify(path.parse(filename).name) || "resume";
  const extension = path.extname(filename).toLowerCase();
  const relativePath = path.join(userId, `${Date.now()}-${safeName}${extension}`);
  const fullPath = path.join(uploadRoot, relativePath);

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, bytes);

  return {
    relativePath,
    fullPath
  };
}
