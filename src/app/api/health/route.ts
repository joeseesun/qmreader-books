import { NextResponse } from "next/server";
import { ensureData } from "@/lib/storage";

export async function GET() {
  try {
    await ensureData();
    return NextResponse.json({ ok: true, service: "qmreader-books", time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, service: "qmreader-books" }, { status: 503 });
  }
}
