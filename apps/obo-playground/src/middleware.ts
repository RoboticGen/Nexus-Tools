import { authMiddleware } from "@nexus-tools/auth/middleware";

// Next reads both exports from the AST: the default must be a literal function, and a re-exported matcher is invisible to it.
export default authMiddleware;

// Brand icons and the manifest are excluded alongside `_next` and `api/auth`: the browser asks for
// them on the login page, while nobody is authenticated, so gating them just answers a 307 and the
// tab renders no icon. Kept as a literal because Next reads this matcher from the AST -- an
// imported value is invisible to it, which is why the same string appears in all three apps.
export const config = {
  matcher: [
    "/((?!_next|api/auth|favicon|apple-touch-icon|android-chrome|site\\.webmanifest).*)",
  ],
};
