import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { NextResponse } from "next/server";
import { bookDir, readLibrary, writeLibrary, type StoredBookRecord } from "@/lib/storage";
import type { BookRecord } from "@/lib/types";

const execFileAsync = promisify(execFile);
const allowed = new Set(["epub", "azw3", "mobi"]);

function publicBook(book: StoredBookRecord): BookRecord {
  return {
    id: book.id,
    title: book.title,
    format: book.format,
    size: book.size,
    createdAt: book.createdAt,
    status: book.status,
    error: book.error,
  };
}

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ books: (await readLibrary()).map(publicBook) });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "请选择电子书" }, { status: 400 });
  const ext = path.extname(file.name).slice(1).toLowerCase();
  if (!allowed.has(ext)) return NextResponse.json({ error: "第一版支持 EPUB、AZW3 和 MOBI" }, { status: 415 });
  if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: "文件不能超过 100 MB" }, { status: 413 });

  const id = crypto.randomUUID();
  const deleteToken = crypto.randomBytes(24).toString("base64url");
  const dir = bookDir(id);
  await fs.mkdir(dir, { recursive: true });
  const original = path.join(dir, `original.${ext}`);
  await fs.writeFile(original, Buffer.from(await file.arrayBuffer()));
  let storedName = `original.${ext}`;
  let status: BookRecord["status"] = "ready";
  let error: string | undefined;

  if (ext !== "epub") {
    storedName = "book.epub";
    try {
      await execFileAsync(process.env.EBOOK_CONVERT_BIN || "ebook-convert", [original, path.join(dir, storedName)], { timeout: 120_000 });
    } catch {
      status = "failed";
      error = "服务器暂未完成格式转换，请稍后重试或上传 EPUB";
    }
  }

  const record: StoredBookRecord = {
    id,
    title: file.name.replace(/\.(epub|azw3|mobi)$/i, ""),
    originalName: file.name,
    format: ext as BookRecord["format"],
    storedName,
    size: file.size,
    createdAt: new Date().toISOString(),
    status,
    error,
    deleteTokenHash: crypto.createHash("sha256").update(deleteToken).digest("hex"),
  };
  const books = await readLibrary();
  await writeLibrary([record, ...books]);
  return NextResponse.json({ book: publicBook(record), deleteToken }, { status: 201 });
}
