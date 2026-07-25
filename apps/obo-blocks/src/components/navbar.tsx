"use client";

import { signOut, useSession } from "next-auth/react";

export function Navbar() {
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
    <nav className="nav-bar">
      <img
        id="obo-blocks-logo"
        className="obo-blocks-logo"
        alt="Obo Blocks Logo"
        src="/obo_blocks.webp"
      />
      <div className="nav-bar-actions">
        <button
          type="button"
          onClick={handleLogout}
          className="logout-button"
          aria-label="Log out"
          title="Log out"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="logout-icon"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
        <a
          href="https://roboticgenacademy.com/"
          aria-label="Roboticgen Academy"
        >
          <img
            id="roboticgen-academy-logo"
            alt="Roboticgen Academy Logo"
            className="logo"
            src="/academyLogo.webp"
          />
        </a>
      </div>
    </nav>
  );
}
