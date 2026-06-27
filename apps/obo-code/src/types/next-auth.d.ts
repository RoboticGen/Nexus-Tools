import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: "admin" | "mentor" | "student";
      roles?: string[];
    } & DefaultSession["user"];
    accessToken?: string;
    idToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
