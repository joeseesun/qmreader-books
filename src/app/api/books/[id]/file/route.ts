import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { bookDir, readLibrary } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = (await readLibrary()).find((item) => item.id === id);
  if (!book || book.status !== "ready") return NextResponse.json({ error: "书籍不可用" }, { status: 404 });
  const data = await fs.readFile(path.join(bookDir(id), book.storedName));
  return new Response(data, { headers: { "Content-Type": "application/epub+zip", "Cache-Control": "public, max-age=3600" } });
}
