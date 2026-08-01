import { promises as fs } from "node:fs";
import path from "node:path";
import type { BookRecord } from "./types";

export type StoredBookRecord = BookRecord & {
  originalName: string;
  storedName: string;
  deleteTokenHash?: string;
};

export const dataDir = process.env.DATA_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "data");
const libraryFile = path.join(dataDir, "library.json");

export async function ensureData() {
  await fs.mkdir(path.join(dataDir, "books"), { recursive: true });
  try { await fs.access(libraryFile); } catch { await fs.writeFile(libraryFile, "[]\n"); }
}

export async function readLibrary(): Promise<StoredBookRecord[]> {
  await ensureData();
  return JSON.parse(await fs.readFile(libraryFile, "utf8")) as StoredBookRecord[];
}

export async function writeLibrary(books: StoredBookRecord[]) {
  await ensureData();
  const temp = `${libraryFile}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(books, null, 2)}\n`);
  await fs.rename(temp, libraryFile);
}

export function bookDir(id: string) { return path.join(dataDir, "books", id); }
