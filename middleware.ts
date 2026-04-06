import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;

  // 1. Exclude public assets and login page from middleware
  const isPublicRoute = 
    nextUrl.pathname.startsWith("/login") || 
    nextUrl.pathname.startsWith("/api/login") ||
    nextUrl.pathname.startsWith("/_next") || 
    nextUrl.pathname.includes(".") || // static files
    nextUrl.pathname === "/favicon.ico";

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 2. Check for session cookie
  const cookie = request.cookies.get("session")?.value;
  
  if (!cookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // 3. Verify session
    await decrypt(cookie);
    return NextResponse.next();
  } catch (err) {
    // 4. Invalid session - redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }
}

// Optionally, you can specify matcher to limit where middleware runs
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) -> we might want to protect these too, except /api/login
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/login|_next/static|_next/image|favicon.ico).*)',
  ],
};
