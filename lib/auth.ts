import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });
          if (!user || !user.password) return null;
          if (!user.isActive) throw new Error("Account deactivated. Contact your administrator.");

          const isValid = await bcrypt.compare(credentials.password as string, user.password);
          if (!isValid) return null;

          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatar,
            role: user.role,
          };
        } catch (error) {
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const existing = await prisma.user.findUnique({
            where: { email: user.email! },
          });
          if (!existing) throw new Error("NoAccount");
          if (!existing.isActive) throw new Error("Deactivated");

          await prisma.user.update({
            where: { id: existing.id },
            data: {
              googleId: user.id,
              lastLogin: new Date(),
              ...(user.image && !existing.avatar && { avatar: user.image }),
            },
          });
          return true;
        } catch (e: any) {
          if (e.message === "NoAccount") return "/login?error=OAuthAccountNotLinked";
          if (e.message === "Deactivated") return "/login?error=AccountDeactivated";
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        // On initial sign-in, load full user data
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, role: true, isActive: true, avatar: true, name: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.image = dbUser.avatar;
            token.name = dbUser.name;
          }
        } catch {
          token.id = user.id;
          token.role = (user as any).role || "SITE_MANAGER";
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        if (token.image) session.user.image = token.image as string;
      }
      return session;
    },
  },
});
