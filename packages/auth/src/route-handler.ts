import NextAuth from "next-auth";

import { getAuthConfig } from "./config";

/** The NextAuth catch-all handler, shared by both apps' `app/api/auth/[...nextauth]/route.ts`. */
const handler = NextAuth(getAuthConfig());

export { handler as GET, handler as POST };
