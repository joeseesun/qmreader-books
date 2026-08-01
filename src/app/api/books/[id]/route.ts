import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { bookDir, readLibrary, writeLibrary } from "@/lib/storage";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const books = await readLibrary();
  const book = books.find((item) => item.id === id);
  if (!book) return NextResponse.json({ error: "书籍不存在" }, { status: 404 });
  const token = request.headers.get("x-delete-token") || "";
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expected = book.deleteTokenHash || "";
  if (
    expected.length !== tokenHash.length ||
    !crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "只有上传者可以删除这本书" }, { status: 403 });
  }
  await fs.rm(bookDir(id), { recursive: true, force: true });
  await writeLibrary(books.filter((book) => book.id !== id));
  return NextResponse.json({ ok: true });
}
