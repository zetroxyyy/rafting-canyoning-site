import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Check admin user exists and is active
        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.isActive) return null;

        // Compare against bcrypt hash stored in DB (set via Settings → Security).
        // Falls back to ADMIN_PASSWORD env var for accounts without a DB hash.
        let passwordValid = false;
        if (user.passwordHash) {
          const bcrypt = await import("bcryptjs");
          passwordValid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        } else {
          const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme";
          passwordValid = credentials.password === adminPassword;
        }
        if (!passwordValid) return null;


        // Update last login
        await prisma.adminUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
});
