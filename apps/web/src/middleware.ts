import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/doguinho/constants";

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const entrar = request.nextUrl.pathname.startsWith("/entrar");
  if (!session && !entrar) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  if (session && entrar) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|marca-doguinho.png|manifest.webmanifest).*)"],
};
