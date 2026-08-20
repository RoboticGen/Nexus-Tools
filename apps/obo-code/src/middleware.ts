import { authMiddleware } from "@nexus-tools/auth/middleware";

/*
  Next statically analyses this file, so both exports have to be literals here
  rather than `export … from` re-exports of the shared package:

  - the default export must be recognisable as a function, or the build fails
    with "must export a function";
  - `config.matcher` is read from the AST, and a re-exported array is invisible
    to it — which would leave every route unprotected.

  The behaviour still lives once, in `@nexus-tools/auth/middleware`.
*/
export default authMiddleware;

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/auth).*)"],
};
