"use client";

import { buildKeycloakLogoutUrl } from "@nexus-tools/auth";
import { signOut, useSession } from "next-auth/react";

export function LogoutButton() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    const logoutUrl = buildKeycloakLogoutUrl({
      origin: window.location.origin,
      idToken: session?.idToken,
    });
    window.location.assign(logoutUrl);
  };

  return (
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
  );
}
