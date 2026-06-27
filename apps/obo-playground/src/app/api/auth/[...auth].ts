import NextAuth from "next-auth";
import { getAuthConfig } from "@nexus-tools/auth";

console.log("[Auth Route] Initializing NextAuth");

const authOptions = getAuthConfig();
const handler = NextAuth(authOptions);

console.log("[Auth Route] NextAuth handler created");

export { handler as GET, handler as POST };

