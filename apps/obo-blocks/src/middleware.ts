import { authMiddleware } from "@nexus-tools/auth/middleware";

// Next reads both exports from the AST: the default must be a literal function, and a re-exported
// matcher is invisible to it.
export default authMiddleware;

// This matcher MUST stay a literal. Next resolves it by static analysis before any module runs, so
// `matcher: someImportedConst` yields no matcher at all -- the build stays green and every gated
// route silently becomes public. That is why the same string is repeated in all three apps instead
// of being shared from @nexus-tools/auth; keep the copies in step.
//
// Brand icons and the manifest are excluded alongside `_next` and `api/auth`: the browser asks for
// them on the login page, while nobody is authenticated, so gating them just answers a 307 and the
// tab renders no icon.
export const config = {
  matcher: [
    "/((?!_next|api/auth|favicon|apple-touch-icon|android-chrome|site\\.webmanifest).*)",
  ],
};
