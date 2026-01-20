export function Navbar() {
  return (
    <nav className="nav-bar">
      <img
        id="obo-blocks-logo"
        className="obo-blocks-logo"
        alt="Obo Blocks Logo"
        src="/obo_blocks.webp"
      />
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
    </nav>
  );
}
