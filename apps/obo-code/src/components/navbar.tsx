"use client";

import Image from "next/image";
import Link from "next/link";
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
    <nav className="navbar">
      <Image
        src="/images/OboCode.webp"
        alt="Obo Code Logo"
        width={263}
        height={45}
        className="obo-logo"
        priority
      />
      <div className="navbar-actions">
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
            className="h-5 w-5"
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
        <Link
          href="https://roboticgenacademy.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Roboticgen Academy"
        >
          <Image
            src="/images/academyLogo.webp"
            alt="Roboticgen Academy Logo"
            width={125}
            height={37}
            className="academy-logo"
          />
        </Link>
      </div>
    </nav>
  );
}
