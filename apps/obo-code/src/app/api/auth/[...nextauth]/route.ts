import NextAuth from "next-auth";
import { getAuthConfig } from "@nexus-tools/auth";

const handler = NextAuth(getAuthConfig());

export { handler as GET, handler as POST };
