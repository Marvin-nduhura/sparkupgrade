import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return NextResponse.json({ error: `Validation failed: ${messages}`, code: "VALIDATION_ERROR" }, { status: 422 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return NextResponse.json({ error: "A record with this value already exists.", code: "DUPLICATE" }, { status: 409 });
      case "P2025":
        return NextResponse.json({ error: "Record not found.", code: "NOT_FOUND" }, { status: 404 });
      case "P2003":
        return NextResponse.json({ error: "Related record not found.", code: "FOREIGN_KEY" }, { status: 400 });
      default:
        return NextResponse.json({ error: "Database error occurred.", code: error.code }, { status: 500 });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json({ error: "Invalid data provided.", code: "VALIDATION_ERROR" }, { status: 422 });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }

  return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
}

export function requireAuth(session: any) {
  if (!session?.user) throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
}

export function requireRole(session: any, ...roles: string[]) {
  requireAuth(session);
  if (!roles.includes(session.user.role)) {
    throw new AppError("You don't have permission to perform this action.", 403, "FORBIDDEN");
  }
}

export function requireProjectAccess(session: any, projectId: string, assignments: string[]) {
  if (session.user.role === "SITE_MANAGER" && !assignments.includes(projectId)) {
    throw new AppError("You are not assigned to this project.", 403, "NO_PROJECT_ACCESS");
  }
}
