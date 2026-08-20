import { authMiddleware } from "@nexus-tools/auth/middleware";

// Next reads both exports from the AST: the default must be a literal function, and a re-exported matcher is invisible to it.
export default authMiddleware;

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/auth).*)"],
};
