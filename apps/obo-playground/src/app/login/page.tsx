"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  useEffect(() => {
    // Kick off the Keycloak flow as soon as we hit the client. signIn() must
    // run here (not server-side) so NextAuth can set its state/PKCE cookies
    // before redirecting; the callback validates them.
    signIn("keycloak", { redirect: true, callbackUrl });
  }, [callbackUrl]);

  // Render nothing so the user never sees an intermediate page — just a brief
  // blank frame before the browser navigates to Keycloak.
  return null;
}
