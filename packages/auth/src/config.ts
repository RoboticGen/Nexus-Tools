import KeycloakProvider from "next-auth/providers/keycloak";

import type { NextAuthSession } from "./types";
import type { NextAuthOptions } from "next-auth";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} env var is required`);
  }
  return value;
}

export interface PublicKeycloakConfig {
  keycloakUrl: string;
  realm: string;
  clientId: string;
}

/**
 * Keycloak details needed by client components — currently RP-initiated logout.
 *
 * These are read as literal `process.env.NEXT_PUBLIC_*` expressions rather than
 * through `required()`, because Next inlines only literal member accesses at
 * build time. A dynamic `process.env[name]` lookup resolves to `undefined` in
 * the browser no matter how the variable is set.
 *
 * Call this at module scope so the check runs when the module is first evaluated,
 * not when someone clicks Log out. Note this is not a build-time guarantee: the
 * workspace apps render every route dynamically, so nothing is prerendered and a
 * missing value surfaces on the first render of a page that mounts the navbar.
 * That is still far earlier, and far louder, than silently signing users out
 * against the production realm.
 */
export function getPublicKeycloakConfig(): PublicKeycloakConfig {
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;

  if (!keycloakUrl) throw new Error("NEXT_PUBLIC_KEYCLOAK_URL env var is required");
  if (!realm) throw new Error("NEXT_PUBLIC_KEYCLOAK_REALM env var is required");
  if (!clientId) throw new Error("NEXT_PUBLIC_KEYCLOAK_CLIENT_ID env var is required");

  return { keycloakUrl, realm, clientId };
}

/**
 * NextAuth configuration for the Keycloak provider.
 *
 * Required: KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID, plus NEXTAUTH_URL
 * and NEXTAUTH_SECRET, which NextAuth reads from the environment itself.
 * Optional: KEYCLOAK_CLIENT_SECRET — see below.
 */
export function getAuthConfig(): NextAuthOptions {
  const keycloakUrl = required("KEYCLOAK_URL");
  const realm = required("KEYCLOAK_REALM");
  const clientId = required("KEYCLOAK_CLIENT_ID");

  // `obo-nexus` is registered in the `roboticgen` realm as a PUBLIC client, so
  // there is no secret to send — the realm refuses client authentication for it
  // outright ("Public client not allowed to retrieve service account"). Requiring
  // one here is what pushed deployments into inventing placeholder values.
  //
  // The flow is still sound without it: the authorization code is bound to a PKCE
  // challenge, which is precisely the protection a public client relies on.
  //
  // Left optional rather than removed so this config keeps working unchanged if
  // the client is ever switched to confidential.
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
  const isPublicClient = !clientSecret;
  return {
    debug: process.env.NODE_ENV === "development",
    providers: [
      KeycloakProvider({
        clientId,
        clientSecret: clientSecret ?? "",
        issuer: `${keycloakUrl}/realms/${realm}`,
        // Without this, openid-client defaults to `client_secret_basic` and sends
        // an Authorization header the realm will not accept for a public client.
        ...(isPublicClient ? { client: { token_endpoint_auth_method: "none" } } : {}),
        authorization: {
          params: {
            scope: "openid profile email roles",
          },
        },
      }) as any,
    ],
    session: {
      strategy: "jwt",
      maxAge: 60 * 60, // 1 hour
      updateAge: 60 * 10, // re-run jwt callback at least every 10 minutes
    },
    jwt: {
      maxAge: 60 * 60, // 1 hour
    },
    callbacks: {
      async jwt({ token, account, profile }) {
        try {
          // Initial sign in
          if (account) {
            token.accessToken = account.access_token;
            token.refreshToken = account.refresh_token;
            token.idToken = account.id_token;
            token.expiresAt = (account.expires_at || Date.now() / 1000 + 3600) as number;
            token.sub = account.providerAccountId;

            // Extract realm roles from the Keycloak profile (id_token claims)
            const p = profile as any;
            token.roles = p?.realm_access?.roles ?? p?.roles ?? [];
          }

          // Refresh token if expired (within 5 minutes)
          if (
            token.expiresAt &&
            typeof token.expiresAt === "number" &&
            Date.now() > (token.expiresAt - 300) * 1000
          ) {
            try {
              const response = await fetch(
                `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({
                    client_id: clientId,
                    // Omitted entirely for a public client; sending an empty
                    // `client_secret` is not the same as sending none.
                    ...(clientSecret ? { client_secret: clientSecret } : {}),
                    grant_type: "refresh_token",
                    refresh_token: (token.refreshToken as string) || "",
                  }),
                }
              );

              if (!response.ok) {
                console.error("Token refresh failed:", response.status);
                return { ...token, error: "RefreshAccessTokenError" };
              }

              // `Response.json()` resolves to `unknown` from TypeScript 6 — it used to be `any`, which let these four reads through unchecked. Naming the shape is the fix, not a cast: this is Keycloak's token response and nothing else.
              const refreshedTokens = (await response.json()) as {
                access_token?: string;
                refresh_token?: string;
                expires_in?: number;
              };
              token.accessToken = refreshedTokens.access_token;
              token.refreshToken = refreshedTokens.refresh_token || token.refreshToken;
              token.expiresAt = refreshedTokens.expires_in
                ? Math.floor(Date.now() / 1000) + refreshedTokens.expires_in
                : (token.expiresAt as number);
              // Clear any previous refresh error after a successful refresh
              delete token.error;
            } catch (error) {
              console.error("Token refresh error:", error);
              return { ...token, error: "RefreshAccessTokenError" };
            }
          }

          return token;
        } catch (error) {
          console.error("JWT callback error:", error);
          return token;
        }
      },

      async session({ session, token }): Promise<NextAuthSession> {
        try {
          return {
            ...session,
            user: {
              id: (token.sub as string) || "",
              email: token.email || "",
              name: token.name || "",
              role: (token.roles as string[])?.includes("admin")
                ? "admin"
                : (token.roles as string[])?.includes("mentor")
                  ? "mentor"
                  : "student",
              roles: (token.roles as string[]) || [],
              image: token.picture as string | undefined,
            },
            accessToken: token.accessToken as string,
            // idToken is exposed for RP-initiated logout (id_token_hint). refreshToken is intentionally NOT returned: it must never leave the server, where it is kept inside the encrypted JWT cookie.
            idToken: token.idToken as string | undefined,
            expiresAt: token.expiresAt as number,
            error: token.error as string | undefined,
          };
        } catch (error) {
          console.error("Session callback error:", error);
          return session as NextAuthSession;
        }
      },

      async redirect({ url, baseUrl }) {
        try {
          // Allows relative callback URLs
          if (url.startsWith("/")) return `${baseUrl}${url}`;
          // Allows callback URLs on the same origin
          const urlObj = new URL(url);
          if (urlObj.origin === baseUrl) return url;
        } catch {
          return baseUrl;
        }
        return baseUrl;
      },
    },

    pages: {
      signIn: "/login",
      error: "/login",
    },
  };
}
