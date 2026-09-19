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

// On Render free tier there is no persistent disk.
// We store in /tmp (ephemeral) and serve via /api/files.
// On local dev or paid tier with PERSISTENT_DISK=true, serve from public/uploads.
function getUploadBase(): string {
  if (process.env.NODE_ENV === "production" && process.env.PERSISTENT_DISK !== "true") {
    return "/tmp/buildspark-uploads";
  }
  return path.join(process.cwd(), "public", "uploads");
}

function getPublicUrl(subDir: string, filename: string): string {
  if (process.env.NODE_ENV === "production" && process.env.PERSISTENT_DISK !== "true") {
    return `/api/files/${subDir}/${filename}`;
  }
  return `/uploads/${subDir}/${filename}`;
}

export async function saveUploadedFile(
  file: File,
  subDir: string,
  allowedTypes: string[] = ALLOWED_DOC_TYPES
): Promise<string> {
  // Accept if explicitly allowed, or if it's any image/* or application/* type
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

  const uploadDir = path.join(getUploadBase(), subDir);
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const filename = `${uuidv4()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadDir, filename), buffer);

  return getPublicUrl(subDir, filename);
}

export async function deleteUploadedFile(fileUrl: string): Promise<void> {
  try {
    if (!fileUrl) return;
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
