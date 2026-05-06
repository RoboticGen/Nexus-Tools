"use client";

import { useSession, signOut } from "next-auth/react";
import type { NextAuthSession } from "@nexus-tools/auth";

interface UseAuthReturn {
  session: NextAuthSession | null;
  status: "loading" | "authenticated" | "unauthenticated";
  isLoading: boolean;
  isAuthenticated: boolean;
  user: NextAuthSession["user"] | null;
  logout: () => Promise<void>;
}

/**
 * Custom hook to access authentication session and status
 * @returns Authentication state and utilities
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const logout = async () => {
    await signOut({ redirect: true });
  };

  return {
    session: session as NextAuthSession | null,
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    user: session?.user || null,
    logout,
  };
}
