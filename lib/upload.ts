import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"];
const MAX_SIZE_MB = 10;

export async function saveUploadedFile(
  file: File,
  subDir: string,
  allowedTypes: string[] = ALLOWED_DOC_TYPES
): Promise<string> {
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed.`);
  }

  const sizeInMB = file.size / (1024 * 1024);
  if (sizeInMB > MAX_SIZE_MB) {
    throw new Error(`File size exceeds ${MAX_SIZE_MB}MB limit.`);
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", subDir);
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const filename = `${uuidv4()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadDir, filename), buffer);

  return `/uploads/${subDir}/${filename}`;
}

export async function deleteUploadedFile(fileUrl: string): Promise<void> {
  try {
    if (!fileUrl || !fileUrl.startsWith("/uploads/")) return;
    const filePath = path.join(process.cwd(), "public", fileUrl);
    await fs.unlink(filePath);
  } catch {
    // Ignore deletion errors
  }
}

export function getFileBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}
