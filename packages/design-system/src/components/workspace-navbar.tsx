"use client";

import { getPublicKeycloakConfig, type PublicKeycloakConfig } from "@nexus-tools/auth";
import { LogIn, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import { toast } from "sonner";

import { AppHeader } from "@nexus-tools/design-system/components/ui/app-header";
import { Button } from "@nexus-tools/design-system/components/ui/button";
import {
  ConnectionStatus,
  type ConnectionState,
} from "@nexus-tools/design-system/components/ui/connection-status";
import { ThemeToggle } from "@nexus-tools/design-system/components/ui/theme-toggle";

// Resolved once, at module evaluation, so a missing NEXT_PUBLIC_* var is logged on first render
// rather than on a user's first logout click. Caught rather than thrown: guests render this bar on
// every page, and a missing logout setting must not take the whole tool down with a 500.
const keycloak: PublicKeycloakConfig | null = (() => {
  try {
    return getPublicKeycloakConfig();
  } catch (error) {
    console.error(error);
    return null;
  }
})();

interface WorkspaceNavbarProps {
  /** App name. Used as the brand when there is no logo, and as the logo's alt text. */
  title: string;
  /** Logo shown instead of the title. */
  logoSrc?: string;
  connectionState?: ConnectionState;
  connectionLabel?: string;
}

/** Top bar with the Keycloak sign-in and logout flows, shared by all three apps. */
export function WorkspaceNavbar({
  title,
  logoSrc,
  connectionState = "disconnected",
  connectionLabel = "ESP32 connected",
}: WorkspaceNavbarProps) {
  const { data: session, status } = useSession();
  // A session whose Keycloak refresh failed still reads as "authenticated", but it is dead: show
  // Sign in for it, as for a guest. Signing in again replaces it.
  const isSignedIn = status === "authenticated" && !session?.error;

  // The auth proxy turns NextAuth's /login?error=… into /?authError=… for guests. Say so once, then
  // drop the parameter so a reload or a retried sign-in does not repeat it.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("authError")) return;
    toast.error("Sign-in didn't complete. You can keep working as a guest or try again.");
    url.searchParams.delete("authError");
    window.history.replaceState(window.history.state, "", url);
  }, []);

  // Through /login rather than signIn() here, so the gate's redirect and this button share one
  // sign-in entry point.
  const handleSignIn = () => {
    const { pathname, search, hash } = window.location;
    window.location.assign(`/login?callbackUrl=${encodeURIComponent(pathname + search + hash)}`);
  };

  const handleLogout = async () => {
    if (!keycloak) {
      // No Keycloak settings to end the SSO session with: clear the local session at least.
      await signOut({ callbackUrl: "/" });
      return;
    }
    await signOut({ redirect: false });
    const postLogout = `${window.location.origin}/login`;
    const logoutUrl = new URL(
      `${keycloak.keycloakUrl}/realms/${keycloak.realm}/protocol/openid-connect/logout`
    );
    logoutUrl.searchParams.set("post_logout_redirect_uri", postLogout);
    logoutUrl.searchParams.set("client_id", keycloak.clientId);
    if (session?.idToken) {
      logoutUrl.searchParams.set("id_token_hint", session.idToken);
    }
    window.location.assign(logoutUrl.toString());
  };

  return (
    <AppHeader
      brand={
        // A plain <img>, not next/image: a fixed-height brand mark gains nothing from the optimisation pipeline.
        logoSrc ? (
          <img src={logoSrc} alt={title} className="h-8 object-contain" />
        ) : (
          <span className="text-base font-semibold">{title}</span>
        )
      }
      actions={
        <>
          {connectionState === "connected" && (
            <ConnectionStatus state="connected" label={connectionLabel} readOnly />
          )}
          <ThemeToggle />
          {/* Nothing while the session loads, so a signed-in user never sees Sign in flash past. */}
          {status === "loading" ? null : isSignedIn ? (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut aria-hidden="true" />
              Log out
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleSignIn}>
              <LogIn aria-hidden="true" />
              Sign in
            </Button>
          )}
        </>
      }
    />
  );
}
