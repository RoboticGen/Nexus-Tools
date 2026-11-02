import { type NextFetchEvent, NextResponse } from "next/server";
import { type NextRequestWithAuth, withAuth } from "next-auth/middleware";

// Guest access is the default: nothing in the apps needs a session to work, so students open the
// tools straight away and sign in only if they want to. Set REQUIRE_LOGIN=true on a deployment to
// put every page behind Keycloak again. Read on the server when the proxy loads, so changing it
// needs a restart, not a rebuild.
const requireLogin = process.env.REQUIRE_LOGIN === "true";

const keycloakGate = withAuth(
  function middleware() {
    // If user is not authenticated, withAuth will handle the redirect based on the pages.signIn config
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (!requireLogin) {
          return true;
        }

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

/** Route protection for all three workspace apps. */
export function authMiddleware(req: NextRequestWithAuth, event: NextFetchEvent) {
  // Keycloak's post-logout redirect lands on /login, which would start a fresh sign-in straight
  // away. A guest who just logged out wants the tool, not the Keycloak form, so send them home.
  // The gate's own redirect to /login always carries a callbackUrl, so this never catches it.
  // It has to run before withAuth, which returns early on its sign-in page without calling ours.
  if (
    !requireLogin &&
    req.nextUrl.pathname === "/login" &&
    !req.nextUrl.searchParams.has("callbackUrl")
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return keycloakGate(req, event);
}
