"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface UseRequireAuthOptions {
  requiredRole?: string;
  redirectTo?: string;
}

/**
 * Client-side hook that requires authentication
 * Redirects to login page if not authenticated
 * Optionally checks for specific role
 */
export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { requiredRole, redirectTo = "/login" } = options;
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(redirectTo);
    }

    if (
      requiredRole &&
      session?.user?.roles &&
      !session.user.roles.includes(requiredRole)
    ) {
      router.push("/unauthorized");
    }
  }, [session, status, router, requiredRole, redirectTo]);

  return {
    session,
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    hasRequiredRole: requiredRole
      ? session?.user?.roles?.includes(requiredRole) || false
      : true,
  };
}
