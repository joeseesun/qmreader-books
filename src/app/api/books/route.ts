import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { bookDir, readLibrary, writeLibrary } from "@/lib/storage";
import type { BookRecord } from "@/lib/types";

const execFileAsync = promisify(execFile);
const allowed = new Set(["epub", "azw3", "mobi"]);

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json({ books: await readLibrary() });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "请选择电子书" }, { status: 400 });
  const ext = path.extname(file.name).slice(1).toLowerCase();
  if (!allowed.has(ext)) return NextResponse.json({ error: "第一版支持 EPUB、AZW3 和 MOBI" }, { status: 415 });
  if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: "文件不能超过 100 MB" }, { status: 413 });

  const id = crypto.randomUUID();
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

  const record: BookRecord = {
    id,
    title: file.name.replace(/\.(epub|azw3|mobi)$/i, ""),
    originalName: file.name,
    format: ext as BookRecord["format"],
    storedName,
    size: file.size,
    createdAt: new Date().toISOString(),
    status,
    error,
  };
  const books = await readLibrary();
  await writeLibrary([record, ...books]);
  return NextResponse.json({ book: record }, { status: 201 });
}
