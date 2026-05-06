"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  useEffect(() => {
    // Silently redirect to Keycloak - no UI shown
    signIn("keycloak", { redirect: true, callbackUrl });
  }, [callbackUrl]);

  // While redirecting, show minimal loading screen
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
}
