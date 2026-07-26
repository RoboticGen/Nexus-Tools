import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { isAuthorizedRequest } from "./middleware-utils";

const middleware = withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => isAuthorizedRequest(req.nextUrl.pathname, token),
    },
    pages: {
      signIn: "/login",
    },
  }
);

export default middleware;

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/auth).*)"],
};
