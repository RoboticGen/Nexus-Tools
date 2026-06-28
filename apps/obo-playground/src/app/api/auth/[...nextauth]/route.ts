import { getAuthConfig } from "@nexus-tools/auth";
import NextAuth from "next-auth";

const handler = NextAuth(getAuthConfig());

export { handler as GET, handler as POST };
