import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PREFIX_ROLE: Record<string, string> = {
  "/student": "STUDENT",
  "/faculty": "FACULTY",
  "/admin": "ADMIN",
};

// Optimistic check only (cookie present, role matches path). Real authorization happens
// server-side in src/lib/session.ts, which re-validates the user against the database.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const prefix = Object.keys(PREFIX_ROLE).find((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (prefix && PREFIX_ROLE[prefix] !== token.role) {
    return NextResponse.redirect(new URL(`/${String(token.role).toLowerCase()}`, req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/student/:path*", "/faculty/:path*", "/admin/:path*"] };
