"use client";

import { getPublicKeycloakConfig } from "@nexus-tools/auth";
import { LogIn, LogOut } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

import { AppHeader } from "@nexus-tools/design-system/components/ui/app-header";
import { Button } from "@nexus-tools/design-system/components/ui/button";
import {
  ConnectionStatus,
  type ConnectionState,
} from "@nexus-tools/design-system/components/ui/connection-status";
import { ThemeToggle } from "@nexus-tools/design-system/components/ui/theme-toggle";

// Resolved once, at module evaluation, so a missing NEXT_PUBLIC_* var surfaces on
// first render rather than on a user's first logout click.
const { keycloakUrl, realm, clientId } = getPublicKeycloakConfig();

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

  const handleSignIn = () => {
    signIn("keycloak", { callbackUrl: window.location.href });
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    const postLogout = `${window.location.origin}/login`;
    const logoutUrl = new URL(
      `${keycloakUrl}/realms/${realm}/protocol/openid-connect/logout`
    );
    logoutUrl.searchParams.set("post_logout_redirect_uri", postLogout);
    logoutUrl.searchParams.set("client_id", clientId);
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
