import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "qmreader_session";

function tokenFor(password: string) {
  return crypto.createHash("sha256").update(`qmreader:${password}`).digest("hex");
}

export async function isAuthenticated() {
  const password = process.env.READER_PASSWORD;
  if (!password && process.env.NODE_ENV !== "production") return true;
  if (!password) return false;
  return (await cookies()).get(COOKIE)?.value === tokenFor(password);
}

export async function setAuthCookie(password: string) {
  (await cookies()).set(COOKIE, tokenFor(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearAuthCookie() {
  (await cookies()).delete(COOKIE);
}

export function passwordMatches(candidate: string) {
  const expected = process.env.READER_PASSWORD;
  if (!expected) return process.env.NODE_ENV !== "production";
  const a = Buffer.from(tokenFor(candidate));
  const b = Buffer.from(tokenFor(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
