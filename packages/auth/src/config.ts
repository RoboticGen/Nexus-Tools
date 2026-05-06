import type { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import type { KeycloakToken, NextAuthSession } from "./types";

/**
 * Get NextAuth configuration for Keycloak OAuth provider
 * Environment variables should be set: KEYCLOAK_URL, KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET, KEYCLOAK_REALM, NEXTAUTH_URL
 */
export function getAuthConfig(): NextAuthOptions {
  const keycloakUrl = process.env.KEYCLOAK_URL || "https://auth.roboticgen.co";
  const realm = process.env.KEYCLOAK_REALM || "roboticgen";
  const clientId = process.env.KEYCLOAK_CLIENT_ID || "obo-nexus";
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET || "124";
  const nextAuthUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";

  // Log configuration for debugging (development only)
  if (process.env.NODE_ENV === "development") {
    console.log("[NextAuth Config]", {
      keycloakUrl,
      realm,
      clientId,
      nextAuthUrl,
      callbackUrl: `${nextAuthUrl}/api/auth/callback/keycloak`,
    });
  }

  return {
    debug: process.env.NODE_ENV === "development",
    providers: [
      KeycloakProvider({
        clientId,
        clientSecret,
        issuer: `${keycloakUrl}/realms/${realm}`,
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
      updateAge: 60 * 60, // 1 hour
    },
    jwt: {
      maxAge: 60 * 60, // 1 hour
    },
    callbacks: {
      async jwt({ token, account }) {
        try {
          // Initial sign in
          if (account) {
            token.accessToken = account.access_token;
            token.refreshToken = account.refresh_token;
            token.idToken = account.id_token;
            token.expiresAt = (account.expires_at || Date.now() / 1000 + 3600) as number;
            token.sub = account.providerAccountId;
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
                    client_secret: clientSecret,
                    grant_type: "refresh_token",
                    refresh_token: (token.refreshToken as string) || "",
                  }),
                }
              );

              if (!response.ok) {
                console.error("Token refresh failed:", response.status);
                return token;
              }

              const refreshedTokens = await response.json();
              token.accessToken = refreshedTokens.access_token;
              token.refreshToken = refreshedTokens.refresh_token || token.refreshToken;
              token.expiresAt = refreshedTokens.expires_in
                ? Math.floor(Date.now() / 1000) + refreshedTokens.expires_in
                : (token.expiresAt as number);
            } catch (error) {
              console.error("Token refresh error:", error);
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
              role: (token.roles as string[])?.includes("admin") ? "admin" : "user",
              roles: (token.roles as string[]) || [],
              image: token.picture as string | undefined,
            },
            accessToken: token.accessToken as string,
            idToken: token.idToken as string | undefined,
            refreshToken: token.refreshToken as string,
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

    trustHost: true,
  };
}
