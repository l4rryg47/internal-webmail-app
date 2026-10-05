import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedPaths = ["/mail", "/settings", "/admin", "/compose", "/rules"];

  if (!protectedPaths.some((protectedPath) => path === protectedPath || path.startsWith(`${protectedPath}/`))) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/mail/:path*", "/settings/:path*", "/admin/:path*", "/compose/:path*", "/rules/:path*"],
};
