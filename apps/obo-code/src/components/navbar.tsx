"use client";

import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { AppHeader } from "@/components/ui/app-header";
import { Button } from "@/components/ui/button";
import { ConnectionStatus, type ConnectionState } from "@/components/ui/connection-status";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface NavbarProps {
  connectionState?: ConnectionState;
}

export function Navbar({ connectionState = "disconnected" }: NavbarProps) {
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
        // eslint-disable-next-line @next/next/no-img-element -- fixed-height brand mark, not a content image; next/image's remote-optimization pipeline adds nothing here.
        <img src="/images/OboCode.webp" alt="Obo Code" className="h-8 object-contain" />
      }
      actions={
        <>
          {connectionState === "connected" && (
            <ConnectionStatus state="connected" label="ESP32 connected" readOnly />
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
