
import { Session, User } from "next-auth";
import type { AuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        // Decode the base64 encoded password hash from environment variable
        const encodedHash = process.env.ADMIN_PASSWORD_HASH_B64 || "";
        const decodedHash = Buffer.from(encodedHash, "base64").toString("utf-8");
      
        const isValidUser = credentials.username === process.env.ADMIN_USERNAME;
        const isValidPass = await bcrypt.compare(
          credentials.password,
          decodedHash || ""
        );

        if (isValidUser && isValidPass) {
          return { id: "admin", name: "Admin User", role: "admin" };
        }

        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  // NextAuth  store session data in a signed+encrypted JWT cookie
  // NextAuth does the encryption and decryption using NEXTAUTH_SECRET
  session: { 
    strategy: "jwt" as const, 
    maxAge: Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES) * 60,    // 30 minutes
    updateAge: 5 * 60, // refresh if active for 5 mins, This keeps active users logged in and kicks idle ones out.
  }, 
  
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) token.user = user;
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token.user) {
        session.user = token.user;
      }
      return session;
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);  //no ctx.req/res needed in App Router
}