"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CircleAlert,
  Library,
  Loader2,
  LockKeyhole,
  LogOut,
  Trash2,
  Upload,
} from "lucide-react";
import type { BookRecord } from "@/lib/types";

export default function LibraryApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState<BookRecord | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const auth = await fetch("/api/auth").then((r) => r.json());
    setAuthed(auth.authenticated);
    if (auth.authenticated) {
      const data = await fetch("/api/books").then((r) => r.json());
      setBooks(data.books || []);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!deleting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeleting(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleting]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) setMessage("密码不正确，请重新输入。");
    else await load();
    setBusy(false);
  }

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
    });
    if (response.ok)
      setBooks((items) => items.filter((book) => book.id !== deleting.id));
    else setMessage("删除失败，请稍后重试。");
    setDeleting(null);
    setBusy(false);
  }

  if (authed === null)
    return (
      <main className="center-state">
        <Loader2 className="spin" aria-hidden="true" />
        <span>正在打开书房…</span>
      </main>
    );
  if (!authed)
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="brand-mark">
            <BookOpen aria-hidden="true" />
          </div>
          <p className="kicker">QMReader Books</p>
          <h1>回到你的书房</h1>
          <p>电子书、划线和对话都只保存在这间私人书房里。</p>
          <form onSubmit={login}>
            <label htmlFor="password">访问密码</label>
            <div className="password-row">
              <LockKeyhole aria-hidden="true" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入访问密码…"
              />
            </div>
            {message && (
              <p className="form-error" role="alert">
                {message}
              </p>
            )}
            <button className="primary-button" disabled={busy || !password}>
              {busy ? <Loader2 className="spin" aria-hidden="true" /> : null}
              进入书房
            </button>
          </form>
        </section>
      </main>
    );

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
        <button
          className="icon-button"
          aria-label="退出登录"
          onClick={async () => {
            await fetch("/api/auth", { method: "DELETE" });
            setAuthed(false);
          }}
        >
          <LogOut aria-hidden="true" />
        </button>
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
              <button
                className="icon-button book-delete"
                aria-label={`删除《${book.title}》`}
                onClick={() => setDeleting(book)}
              >
                <Trash2 aria-hidden="true" />
              </button>
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
