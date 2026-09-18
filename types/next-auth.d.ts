import type { UserRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: UserRole;
      permissions: { permission: string; granted: boolean }[];
    };
  }

  interface User {
    id: string;
    role?: UserRole;
    permissions?: { permission: string; granted: boolean }[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    permissions: { permission: string; granted: boolean }[];
  }
}
