export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

// Serves uploaded files from /tmp in production (Render free tier)
// or from public/uploads in local dev
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filePath = params.path.join("/");

    // Security: prevent path traversal
    if (filePath.includes("..") || filePath.includes("~")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    let fullPath: string;
    if (process.env.NODE_ENV === "production" && process.env.PERSISTENT_DISK !== "true") {
      fullPath = path.join("/tmp/buildspark-uploads", filePath);
    } else {
      fullPath = path.join(process.cwd(), "public", "uploads", filePath);
    }

    const buffer = await fs.readFile(fullPath);
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      webp: "image/webp", gif: "image/gif", pdf: "application/pdf",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
      },
    });
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
