import { type NextFetchEvent, NextResponse } from "next/server";
import { type NextRequestWithAuth, withAuth } from "next-auth/middleware";

/**
 * Whether every page sits behind Keycloak. Guest access is the default: nothing in the apps needs
 * a session to work, so students open the tools straight away and sign in only if they want to.
 *
 * Parsed fail-closed: only an unset/empty value or an explicit "false" / "0" / "no" / "off" opens
 * the tools to guests. Anything else, a typo included, keeps the gate, so a deployment meant to
 * stay locked never goes public because someone wrote `True` or `1`.
 */
function parseRequireLogin(raw: string | undefined): boolean {
  const value = raw?.trim().toLowerCase() ?? "";
  if (value === "" || ["false", "0", "no", "off"].includes(value)) return false;
  if (!["true", "1", "yes", "on"].includes(value)) {
    console.warn(`REQUIRE_LOGIN=${JSON.stringify(raw)} is not a recognised value; requiring login.`);
  }
  return true;
}

// Read on the server when the proxy loads: locally a restart picks up a change, on Vercel a
// redeploy does.
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

/** Route protection for all three workspace apps. */
export function authMiddleware(req: NextRequestWithAuth, event: NextFetchEvent) {
  if (requireLogin) {
    return keycloakGate(req, event);
  }

  // Guest mode skips withAuth entirely: it would decrypt the session cookie on every request only
  // to let it through, and without NEXTAUTH_SECRET it redirects to its error page, which the
  // bounce below would send straight back here.
  const { pathname, searchParams } = req.nextUrl;
  if (pathname === "/login" && !searchParams.has("callbackUrl")) {
    // NextAuth reports sign-in failures by redirecting to /login?error=… (pages.error). Pass the
    // code on so the navbar can say so, rather than starting another sign-in that may fail the
    // same way.
    const home = new URL("/", req.url);
    const error = searchParams.get("error");
    if (error) home.searchParams.set("authError", error);
    // Otherwise this is Keycloak's post-logout redirect: a guest who just logged out wants the
    // tool, not the Keycloak form. Sign-in from the navbar or the gate always carries a callbackUrl.
    return NextResponse.redirect(home);
  }
  return NextResponse.next();
}
