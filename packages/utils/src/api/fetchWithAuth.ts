import { getSession } from "next-auth/react";

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

  // If unauthorized and we have a refresh token, try to refresh
  if (response.status === 401 && session?.refreshToken && !skipAuth) {
    try {
      // Call the NextAuth refresh endpoint
      const refreshResponse = await fetch("/api/auth/session");

      if (refreshResponse.ok) {
        // Get the new session
        const newSession = await getSession();

        if (newSession?.accessToken) {
          // Retry the original request with new token
          headers.set("Authorization", `Bearer ${newSession.accessToken}`);
          response = await fetch(url, {
            ...fetchOptions,
            headers,
          });
        }
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
  }

  // If still unauthorized after refresh attempt, could redirect to login
  if (response.status === 401 && !skipAuth) {
    // Optionally redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
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
