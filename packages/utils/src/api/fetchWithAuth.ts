import { getSession, signOut } from "next-auth/react";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Fetch wrapper that automatically includes Bearer token in Authorization header
 * Handles token refresh on 401 response
 * @param url - The URL to fetch
 * @param options - Fetch options with optional skipAuth flag
 * @returns Fetch response
 */
export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options;

  // Get current session
  const session = await getSession();

  // Prepare headers
  const headers = new Headers(fetchOptions.headers);

  if (!skipAuth && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  // Make the request
  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // On 401, re-fetch the session. getSession() re-runs the server-side jwt
  // callback, which refreshes the access token if it has expired. We only
  // retry when we actually receive a *different* token, to avoid replaying the
  // same expired credential.
  if (response.status === 401 && !skipAuth) {
    try {
      const refreshed = await getSession();

      // Refresh token is invalid/expired/revoked — the session can't be
      // recovered. Sign out fully (clears the NextAuth cookie) before
      // redirecting, otherwise the stale cookie causes a /login redirect loop.
      if (refreshed?.error === "RefreshAccessTokenError") {
        if (typeof window !== "undefined") {
          await signOut({ callbackUrl: "/login" });
        }
        return response;
      }

      const newToken = refreshed?.accessToken;
      if (newToken && newToken !== session?.accessToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        response = await fetch(url, {
          ...fetchOptions,
          headers,
        });
      }
    } catch (error) {
      console.error("Session refresh failed:", error);
    }
  }

  // Still unauthorized with no recoverable session — send the user to login.
  if (response.status === 401 && !skipAuth && typeof window !== "undefined") {
    await signOut({ callbackUrl: "/login" });
  }

  return response;
}

/**
 * Fetch with Auth and automatic JSON parsing
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function fetchWithAuthJSON<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithAuth(url, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<T>;
}
