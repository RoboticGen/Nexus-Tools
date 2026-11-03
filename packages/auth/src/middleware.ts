import { type NextFetchEvent, NextResponse } from "next/server";
import { type NextRequestWithAuth, withAuth } from "next-auth/middleware";

// Fail-closed: an unrecognised value keeps the login gate.
function parseRequireLogin(raw: string | undefined): boolean {
  const value = raw?.trim().toLowerCase() ?? "";
  if (value === "" || ["false", "0", "no", "off"].includes(value)) return false;
  if (!["true", "1", "yes", "on"].includes(value)) {
    console.warn(`REQUIRE_LOGIN=${JSON.stringify(raw)} is not a recognised value; requiring login.`);
  }
  return true;
}

// Read once at startup: a change needs a restart, or a redeploy on Vercel.
const requireLogin = parseRequireLogin(process.env.REQUIRE_LOGIN);

const keycloakGate = withAuth(
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

export function authMiddleware(req: NextRequestWithAuth, event: NextFetchEvent) {
  if (requireLogin) {
    return keycloakGate(req, event);
  }

  // Guests skip withAuth: without NEXTAUTH_SECRET it redirects to an error page that loops back here.
  const { pathname, searchParams } = req.nextUrl;
  // /login without a callbackUrl is Keycloak's post-logout redirect or NextAuth's error page.
  if (pathname === "/login" && !searchParams.has("callbackUrl")) {
    const home = new URL("/", req.url);
    const error = searchParams.get("error");
    if (error) home.searchParams.set("authError", error);
    return NextResponse.redirect(home);
  }
  return NextResponse.next();
}
