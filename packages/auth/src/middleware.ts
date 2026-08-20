import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

/** Route protection for the workspace apps. obo-code and obo-blocks carried byte-identical copies of this. */
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

        // For all other routes, require authentication
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

/** Next reads `config.matcher` by static analysis of the app's own `middleware.ts`, so the app must spread this into a literal `config` export of its own rather than re-exporting it under a different name. */
export const authMatcher = ["/((?!_next|favicon.ico|api/auth).*)"];
