import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

/** Route protection for all three workspace apps. */
export const authMiddleware = withAuth(
  function middleware() {
    // If user is not authenticated, withAuth will handle the redirect based on the pages.signIn config
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow public routes
        const publicRoutes = ["/login", "/api/auth", "/unauthorized"];
        if (publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route))) {
          return true;
        }

        // `!token.error` matters as much as the token existing: a failed Keycloak refresh
        // returns { ...token, error: "RefreshAccessTokenError" } rather than dropping the
        // token, so a truthy-but-dead session would otherwise pass the gate and only fail
        // later, on the first API call.
        return !!token && !token.error;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

/**
 * Reference copy of the matcher. **Nothing imports this, and nothing can**: Next reads
 * `config.matcher` by static analysis of each app's own `middleware.ts`, so an imported value is
 * invisible to it and the middleware would silently never run. Each app therefore repeats the
 * string as a literal, and this export exists to keep the canonical version in one readable place.
 * Change it here and in all three apps together.
 *
 * The brand icons and the web manifest are excluded alongside `_next` and `api/auth`. A browser
 * requests them on the login page itself, while nobody is authenticated, so gating them just
 * answers a 307 to `/login` and the tab renders no icon. They carry nothing worth protecting.
 */
export const authMatcher = [
  "/((?!_next|api/auth|favicon|apple-touch-icon|android-chrome|site\\.webmanifest).*)",
];
