import Image from "next/image";
import Link from "next/link";

export function Navbar() {
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
    </nav>
  );
}
