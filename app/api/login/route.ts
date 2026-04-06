import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/auth";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  const correctUsername = process.env.AUTH_USERNAME || "admin";
  const correctPassword = process.env.AUTH_PASSWORD;

  if (!correctPassword) {
    return NextResponse.json({ error: "Auth misconfigured" }, { status: 500 });
  }

  if (username === correctUsername && password === correctPassword) {
    // 1. Create a session
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const sessionToken = await encrypt({ username, expires: expiresAt });

    // 2. Set the cookie
    (await cookies()).set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
