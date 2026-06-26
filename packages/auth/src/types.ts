import type { Session } from "next-auth";

export interface KeycloakToken {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  given_name?: string;
  family_name?: string;
  email_verified: boolean;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
}

export interface NextAuthSession extends Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "user" | "guest";
    roles?: string[];
    image?: string;
  };
  accessToken?: string;
  idToken?: string;
  expiresAt?: number;
  error?: string;
}

export interface AuthConfig {
  keycloakUrl: string;
  clientId: string;
  clientSecret: string;
  realm: string;
  redirectUri: string;
}
