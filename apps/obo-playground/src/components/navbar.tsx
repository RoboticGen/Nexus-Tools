import Image from "next/image";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";

export function Navbar() {
  return (
    <nav className="navbar">
      <span className="obo-logo-text">Obo Playground</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
        <LogoutButton />
      </div>
    </nav>
  );
}
