import type { DefaultSession } from "next-auth";

/**
 * Module augmentation for next-auth's `Session`.
 *
 * Lives here rather than in each consumer because it describes what
 * `getAuthConfig` in this package actually puts on the session. It is copied
 * into each app as `src/types/next-auth.d.ts` today — this is the canonical
 * source those copies should collapse onto.
 *
 * Consumers pick it up by listing this path in their tsconfig `include`, NOT
 * by importing it: an ambient `declare module` block applies to whatever is in
 * the compilation, and a runtime `import "./next-auth.d"` makes webpack try to
 * bundle a declaration file, which fails the build.
 */
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
