import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
const ALLOWED_DOC_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];
const MAX_SIZE_MB = 10;
// Images above this size will be compressed / rejected for base64 storage
const MAX_IMAGE_BASE64_MB = 4;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function getUploadBase(): string {
  if (isProduction() && process.env.PERSISTENT_DISK !== "true") {
    return "/tmp/buildspark-uploads";
  }
  return path.join(process.cwd(), "public", "uploads");
}

function getPublicUrl(subDir: string, filename: string): string {
  if (isProduction() && process.env.PERSISTENT_DISK !== "true") {
    return `/api/files/${subDir}/${filename}`;
  }
  return `/uploads/${subDir}/${filename}`;
}

/**
 * Save an uploaded file.
 * - Images on production (Render free tier): stored as base64 data URLs in the DB field.
 *   This avoids /tmp ephemeral loss on container restart.
 * - Documents (PDF, Word, Excel): still saved to disk and served via /api/files.
 * - Local dev: always saved to public/uploads and served statically.
 */
export async function saveUploadedFile(
  file: File,
  subDir: string,
  allowedTypes: string[] = ALLOWED_DOC_TYPES
): Promise<string> {
  const isAllowed = allowedTypes.includes(file.type) ||
    file.type.startsWith("image/") ||
    file.type === "application/octet-stream";

  if (!isAllowed) {
    throw new Error(`File type "${file.type}" is not allowed.`);
  }

  const sizeInMB = file.size / (1024 * 1024);
  if (sizeInMB > MAX_SIZE_MB) {
    throw new Error(`File size ${sizeInMB.toFixed(1)} MB exceeds the ${MAX_SIZE_MB} MB limit.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // On production Render free tier: store images as base64 data URLs
  // This persists in the database and is never lost on container restart
  if (isProduction() && process.env.PERSISTENT_DISK !== "true" && file.type.startsWith("image/")) {
    if (sizeInMB > MAX_IMAGE_BASE64_MB) {
      throw new Error(`Image size ${sizeInMB.toFixed(1)} MB is too large. Maximum ${MAX_IMAGE_BASE64_MB} MB for images.`);
    }
    const base64 = buffer.toString("base64");
    return `data:${file.type};base64,${base64}`;
  }

  // For documents on production, or everything on local dev: save to disk
  const uploadDir = path.join(getUploadBase(), subDir);
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const filename = `${uuidv4()}.${ext}`;
  await fs.writeFile(path.join(uploadDir, filename), buffer);

  return getPublicUrl(subDir, filename);
}

export async function deleteUploadedFile(fileUrl: string): Promise<void> {
  try {
    if (!fileUrl || fileUrl.startsWith("data:")) return; // base64 — nothing to delete on disk
    let filePath: string;
    if (fileUrl.startsWith("/api/files/")) {
      filePath = path.join("/tmp/buildspark-uploads", fileUrl.replace("/api/files/", ""));
    } else if (fileUrl.startsWith("/uploads/")) {
      filePath = path.join(process.cwd(), "public", fileUrl);
    } else {
      return;
    }
    await fs.unlink(filePath);
  } catch {
    // Ignore — file may already be gone
  }
}
