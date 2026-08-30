"use client";

import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { AppHeader } from "@nexus-tools/design-system/components/ui/app-header";
import { Button } from "@nexus-tools/design-system/components/ui/button";
import {
  ConnectionStatus,
  type ConnectionState,
} from "@nexus-tools/design-system/components/ui/connection-status";
import { ThemeToggle } from "@nexus-tools/design-system/components/ui/theme-toggle";

interface WorkspaceNavbarProps {
  /** App name. Used as the brand when there is no logo, and as the logo's alt text. */
  title: string;
  /** Logo shown instead of the title. */
  logoSrc?: string;
  connectionState?: ConnectionState;
  connectionLabel?: string;
}

/** Top bar with the Keycloak logout flow, shared by all three apps. */
export function WorkspaceNavbar({
  title,
  logoSrc,
  connectionState = "disconnected",
  connectionLabel = "ESP32 connected",
}: WorkspaceNavbarProps) {
  const { data: session } = useSession();
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || "https://auth.roboticgen.co";
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "roboticgen";
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "obo-nexus";

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
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut aria-hidden="true" />
            Log out
          </Button>
        </>
      }
    />
  );
}
