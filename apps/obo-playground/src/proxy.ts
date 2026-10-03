import { authMiddleware } from "@nexus-tools/auth/middleware";

export default authMiddleware;

export const config = {
  matcher: [
    "/((?!_next|api/auth|brand|favicon|apple-touch-icon|android-chrome|site\\.webmanifest).*)",
  ],
};
