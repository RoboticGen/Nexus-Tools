"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({
  children,
  fallback,
  requiredRole,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }

    if (
      requiredRole &&
      session?.user?.roles &&
      !session.user.roles.includes(requiredRole)
    ) {
      router.push("/unauthorized");
    }
  }, [session, status, router, requiredRole]);

  if (status === "loading") {
    return (
      fallback || (
        <div className="flex h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        </div>
      )
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (
    requiredRole &&
    session?.user?.roles &&
    !session.user.roles.includes(requiredRole)
  ) {
    return null;
  }

  return <>{children}</>;
}
