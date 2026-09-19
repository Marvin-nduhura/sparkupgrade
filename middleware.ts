import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Paths that never need auth
const PUBLIC_PATHS = [
  "/login", "/api/auth", "/api/pesapal/ipn",
  "/_next", "/icons", "/screenshots", "/uploads",
  "/manifest.json", "/sw.js", "/workbox-", "/favicon.ico",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Get JWT token — works with both secure and non-secure cookies
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    // NextAuth v5 uses different cookie names
    cookieName: process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token",
    secureCookie: process.env.NODE_ENV === "production",
  });

  // Not authenticated — send to login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string;

  // Admin-only routes
  if (pathname.startsWith("/dashboard/admin") && role !== "SYSTEM_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Accountant blocked routes
  const accountantBlocked = ["/dashboard/map", "/dashboard/media"];
  if (accountantBlocked.some(r => pathname.startsWith(r)) && role === "ACCOUNTANT") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|screenshots/|uploads/|manifest.json|sw.js|workbox-).+)",
  ],
};
