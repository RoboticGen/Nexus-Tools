import { authMiddleware } from "@nexus-tools/auth/middleware";

export default authMiddleware;

export const config = {
  matcher: [
    "/((?!_next|api/auth|brand|models|favicon|apple-touch-icon|android-chrome|site\\.webmanifest|og-image\\.png).*)",
  ],
};
