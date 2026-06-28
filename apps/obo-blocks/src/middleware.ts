import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

// Apply auth to all routes except public ones
export default withAuth(
  function middleware() {
    // If user is not authenticated, withAuth will handle the redirect
    // based on the pages.signIn config
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

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/auth).*)"],
};
