import { NextResponse } from "next/server";
import { clearAuthCookie, isAuthenticated, passwordMatches, setAuthCookie } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ authenticated: await isAuthenticated() });
}

export async function POST(request: Request) {
  const { password } = await request.json();
  if (typeof password !== "string" || !passwordMatches(password)) {
    return NextResponse.json({ error: "密码不正确" }, { status: 401 });
  }
  await setAuthCookie(password);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAuthCookie();
  return NextResponse.json({ ok: true });
}
