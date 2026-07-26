import type { JWT } from "next-auth/jwt";

const publicRoutes = ["/login", "/api/auth", "/unauthorized"];

export function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname.startsWith(route));
}

export function isAuthorizedToken(token: JWT | null | undefined): boolean {
  return !!token && token.error == null;
}

export function isAuthorizedRequest(pathname: string, token: JWT | null | undefined): boolean {
  if (isPublicRoute(pathname)) {
    return true;
  }

  return isAuthorizedToken(token);
}
