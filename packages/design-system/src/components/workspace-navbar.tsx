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

// Caught so a missing NEXT_PUBLIC_* var only limits logout instead of 500ing every page.
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
  /** Logo for dark mode. Omit if `logoSrc` already reads on both backgrounds. */
  logoSrcDark?: string;
  connectionState?: ConnectionState;
  connectionLabel?: string;
}

export function WorkspaceNavbar({
  title,
  logoSrc,
  logoSrcDark,
  connectionState = "disconnected",
  connectionLabel = "ESP32 connected",
}: WorkspaceNavbarProps) {
  const { data: session, status } = useSession();
  // A session whose refresh failed still reads as "authenticated".
  const isSignedIn = status === "authenticated" && !session?.error;

  // Set by the auth proxy; removed so a reload doesn't show the toast again.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("authError")) return;
    toast.error("Sign-in didn't complete. You can keep working as a guest or try again.");
    url.searchParams.delete("authError");
    window.history.replaceState(window.history.state, "", url);
  }, []);

  // Via /login, not signIn(), so this and the login gate share one entry point.
  const handleSignIn = () => {
    const { pathname, search, hash } = window.location;
    window.location.assign(`/login?callbackUrl=${encodeURIComponent(pathname + search + hash)}`);
  };

  const handleLogout = async () => {
    if (!keycloak) {
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
          logoSrcDark ? (
            // Both carry the alt text: whichever is hidden is `display: none`, which takes it out of
            // the accessibility tree, so exactly one is announced in either theme.
            <>
              <img src={logoSrc} alt={title} className="h-8 object-contain dark:hidden" />
              <img src={logoSrcDark} alt={title} className="hidden h-8 object-contain dark:block" />
            </>
          ) : (
            <img src={logoSrc} alt={title} className="h-8 object-contain" />
          )
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
          {/* Nothing while loading, so Sign in doesn't flash for signed-in users. */}
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
