import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { bookDir, readLibrary, writeLibrary } from "@/lib/storage";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const books = await readLibrary();
  if (!books.some((book) => book.id === id)) return NextResponse.json({ error: "书籍不存在" }, { status: 404 });
  await fs.rm(bookDir(id), { recursive: true, force: true });
  await writeLibrary(books.filter((book) => book.id !== id));
  return NextResponse.json({ ok: true });
}
