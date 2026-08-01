"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CircleAlert,
  Library,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import type { BookRecord } from "@/lib/types";

const DELETE_TOKENS_KEY = "qmreader-delete-tokens";

export default function LibraryApp() {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [deleteTokens, setDeleteTokens] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState<BookRecord | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const data = await fetch("/api/books").then((r) => r.json());
      setBooks(data.books || []);
      try {
        setDeleteTokens(JSON.parse(localStorage.getItem(DELETE_TOKENS_KEY) || "{}"));
      } catch {
        localStorage.removeItem(DELETE_TOKENS_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!deleting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeleting(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleting]);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage(`正在导入《${file.name}》…`);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/books", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) setMessage(data.error || "导入失败，请重试。");
    else {
      setBooks((items) => [data.book, ...items]);
      if (data.deleteToken) {
        const nextTokens = { ...deleteTokens, [data.book.id]: data.deleteToken };
        setDeleteTokens(nextTokens);
        localStorage.setItem(DELETE_TOKENS_KEY, JSON.stringify(nextTokens));
      }
      setMessage(
        data.book.status === "ready" ? "电子书已加入书架。" : data.book.error,
      );
    }
    if (fileRef.current) fileRef.current.value = "";
    setBusy(false);
  }

  async function removeBook() {
    if (!deleting) return;
    setBusy(true);
    const response = await fetch(`/api/books/${deleting.id}`, {
      method: "DELETE",
      headers: { "x-delete-token": deleteTokens[deleting.id] || "" },
    });
    if (response.ok) {
      setBooks((items) => items.filter((book) => book.id !== deleting.id));
      const nextTokens = { ...deleteTokens };
      delete nextTokens[deleting.id];
      setDeleteTokens(nextTokens);
      localStorage.setItem(DELETE_TOKENS_KEY, JSON.stringify(nextTokens));
    } else setMessage("删除失败，只有原上传浏览器可以删除这本书。");
    setDeleting(null);
    setBusy(false);
  }

  return (
    <main className="library-shell">
      <header className="library-header">
        <div className="brand">
          <span className="brand-mark small">
            <BookOpen aria-hidden="true" />
          </span>
          <div>
            <strong>QMReader</strong>
            <span>Books</span>
          </div>
        </div>
        <span className="public-library-label">公共书架</span>
      </header>
      <section className={`library-intro ${books.length ? "has-books" : ""}`}>
        <div>
          <p className="kicker">你的阅读工作台</p>
          <h1>读进去，问明白。</h1>
          <p>上传一本书，在原文旁边完成划线、笔记和 AI 对话。</p>
        </div>
        <button
          className="primary-button upload-button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="spin" aria-hidden="true" />
          ) : (
            <Upload aria-hidden="true" />
          )}
          上传电子书
        </button>
        <input
          ref={fileRef}
          className="visually-hidden"
          type="file"
          accept=".epub,.azw3,.mobi"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </section>
      {message && (
        <div className="inline-message" aria-live="polite">
          {message}
        </div>
      )}
      {books.length === 0 ? (
        <section
          className="empty-library"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void upload(e.dataTransfer.files[0]);
          }}
        >
          <Library aria-hidden="true" />
          <h2>书架还是空的</h2>
          <p>拖入 EPUB、AZW3 或 MOBI，第一本书就从这里开始。</p>
          <button
            className="secondary-button"
            onClick={() => fileRef.current?.click()}
          >
            <Upload aria-hidden="true" />
            选择电子书
          </button>
        </section>
      ) : (
        <section className="book-grid" aria-label="电子书书架">
          {books.map((book, index) => (
            <article className="book-item" key={book.id}>
              <div className={`book-cover tone-${index % 5}`}>
                <span>{book.title.slice(0, 18)}</span>
                <small>{book.format.toUpperCase()}</small>
              </div>
              <div className="book-info">
                <h2>{book.title}</h2>
                <p>
                  {new Intl.DateTimeFormat("zh-CN", {
                    dateStyle: "medium",
                  }).format(new Date(book.createdAt))}{" "}
                  · {(book.size / 1024 / 1024).toFixed(1)} MB
                </p>
                {book.status === "ready" ? (
                  <Link className="read-link" href={`/read/${book.id}`}>
                    <BookOpen aria-hidden="true" />
                    开始阅读
                  </Link>
                ) : (
                  <p className="book-error">
                    <CircleAlert aria-hidden="true" />
                    {book.error}
                  </p>
                )}
              </div>
              {deleteTokens[book.id] && (
                <button
                  className="icon-button book-delete"
                  aria-label={`删除《${book.title}》`}
                  onClick={() => setDeleting(book)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              )}
            </article>
          ))}
        </section>
      )}
      {deleting && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleting(null);
          }}
        >
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title">删除这本书？</h2>
            <p>
              《{deleting.title}
              》的文件会被删除，当前浏览器里的阅读进度与划线也会失去入口。
            </p>
            <div>
              <button
                className="secondary-button"
                autoFocus
                onClick={() => setDeleting(null)}
              >
                取消
              </button>
              <button
                className="danger-button"
                onClick={() => void removeBook()}
              >
                确认删除
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
