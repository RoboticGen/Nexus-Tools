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

// No matcher is exported from this package, deliberately. Next resolves `config.matcher` by static
// analysis of each app's own `middleware.ts`, before any module is evaluated, so an imported value
// is invisible to it: `matcher: someImportedConst` yields no matcher, builds clean, and leaves every
// gated route public with no error. Each app must therefore spell the matcher out as a literal.
// Keep the three copies in step -- see apps/*/src/middleware.ts.
