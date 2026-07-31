"use client";
/* epub.js exposes its rendition, spine and navigation surfaces without complete TypeScript types. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Highlighter,
  Library,
  List,
  Loader2,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  SendHorizontal,
  Settings2,
  StickyNote,
  Sun,
  X,
} from "lucide-react";
import type { BookRecord, Highlight } from "@/lib/types";

type Settings = {
  fontSize: number;
  lineHeight: number;
  width: number;
  theme: "light" | "sepia" | "dark";
  font: "serif" | "sans";
};
const defaults: Settings = {
  fontSize: 18,
  lineHeight: 1.8,
  width: 720,
  theme: "light",
  font: "serif",
};

export default function ReaderApp({ bookId }: { bookId: string }) {
  const viewer = useRef<HTMLDivElement>(null);
  const rendition = useRef<any>(null);
  const epubBook = useRef<any>(null);
  const [book, setBook] = useState<BookRecord | null>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [chapter, setChapter] = useState("正在定位章节…");
  const [chapterText, setChapterText] = useState("");
  const [bookIndex, setBookIndex] = useState<{ label: string; text: string }[]>(
    [],
  );
  const [settings, setSettings] = useState<Settings>(defaults);
  const [selection, setSelection] = useState<{
    cfi: string;
    text: string;
  } | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [noteMode, setNoteMode] = useState(false);
  const [note, setNote] = useState("");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scope, setScope] = useState<"selection" | "chapter" | "book">(
    "selection",
  );
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(`qmreader:${bookId}:settings`);
      if (saved) setSettings(JSON.parse(saved));
      const savedHighlights = localStorage.getItem(
        `qmreader:${bookId}:highlights`,
      );
      if (savedHighlights) setHighlights(JSON.parse(savedHighlights));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bookId]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const syncPanels = (desktop: boolean) => {
      setLeftOpen(desktop);
      if (!desktop) setRightOpen(false);
    };
    const timer = window.setTimeout(() => syncPanels(media.matches), 0);
    const onMediaChange = (event: MediaQueryListEvent) =>
      syncPanels(event.matches);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSettingsOpen(false);
      setNoteMode(false);
      if (window.innerWidth < 768) {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    media.addEventListener("change", onMediaChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener("change", onMediaChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      const library = await fetch("/api/books").then((r) => r.json());
      const record = library.books?.find(
        (item: BookRecord) => item.id === bookId,
      );
      if (!record || !viewer.current) {
        setError("找不到这本书，请返回书架重新导入。");
        return;
      }
      setBook(record);
      const { default: ePub } = await import("epubjs");
      const instance: any = ePub(`/api/books/${bookId}/file`, {
        openAs: "epub",
      });
      epubBook.current = instance;
      await instance.ready;
      if (cancelled) return;
      const nav = await instance.loaded.navigation;
      setToc(nav.toc || []);
      const render: any = instance.renderTo(viewer.current, {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: "auto",
      });
      rendition.current = render;
      render.on("relocated", (location: any) => {
        localStorage.setItem(`qmreader:${bookId}:location`, location.start.cfi);
        const item = findToc(nav.toc || [], location.start.href);
        setChapter(item?.label?.trim() || "正文");
      });
      render.on("rendered", (_: string, contents: any) =>
        setChapterText(contents.document?.body?.innerText || ""),
      );
      render.on("selected", (cfi: string, contents: any) => {
        const text = contents.window.getSelection()?.toString().trim();
        if (text) setSelection({ cfi, text });
        contents.window.getSelection()?.removeAllRanges();
      });
      const location = localStorage.getItem(`qmreader:${bookId}:location`);
      await render.display(location || undefined);
      const index: { label: string; text: string }[] = [];
      instance.spine.each(async (section: any) => {
        try {
          const doc = await section.load(instance.load.bind(instance));
          const text = doc?.body?.innerText || doc?.body?.textContent || "";
          if (text.trim())
            index.push({ label: section.href, text: text.trim() });
          section.unload();
        } catch {
          /* skip malformed chapter */
        }
      });
      setTimeout(() => setBookIndex(index), 1500);
    }
    void start();
    return () => {
      cancelled = true;
      rendition.current?.destroy();
      epubBook.current?.destroy();
    };
  }, [bookId]);

  useEffect(() => {
    const render = rendition.current;
    if (!render) return;
    const colors =
      settings.theme === "dark"
        ? { bg: "#17181a", text: "rgba(255,255,255,.85)" }
        : settings.theme === "sepia"
          ? { bg: "#f3f0e3", text: "#33301f" }
          : { bg: "#fffdf8", text: "#26241f" };
    render.themes.default({
      body: {
        background: `${colors.bg} !important`,
        color: `${colors.text} !important`,
        "font-family":
          settings.font === "serif"
            ? '"Songti SC", "STSong", serif !important'
            : '-apple-system, "PingFang SC", sans-serif !important',
        "font-size": `${settings.fontSize}px !important`,
        "line-height": `${settings.lineHeight} !important`,
        "max-width": `${settings.width}px !important`,
        margin: "0 auto !important",
        padding: "32px 4vw !important",
      },
      p: { "margin-bottom": "1em !important" },
      img: { "max-width": "100% !important" },
    });
    localStorage.setItem(
      `qmreader:${bookId}:settings`,
      JSON.stringify(settings),
    );
  }, [bookId, settings]);

  useEffect(() => {
    const render = rendition.current;
    if (!render) return;
    highlights.forEach((h) => {
      try {
        render.annotations.highlight(h.cfi, {}, undefined, "qm-highlight", {
          fill: "#e7cc58",
          "fill-opacity": "0.42",
          "mix-blend-mode": "multiply",
        });
      } catch {}
    });
  }, [highlights]);

  function saveHighlight(withNote = false) {
    if (!selection) return;
    const item: Highlight = {
      id: crypto.randomUUID(),
      cfi: selection.cfi,
      text: selection.text,
      chapter,
      note: withNote ? note : undefined,
      createdAt: new Date().toISOString(),
    };
    const next = [...highlights, item];
    setHighlights(next);
    localStorage.setItem(`qmreader:${bookId}:highlights`, JSON.stringify(next));
    try {
      rendition.current?.annotations.highlight(
        item.cfi,
        {},
        undefined,
        "qm-highlight",
        { fill: "#e7cc58", "fill-opacity": "0.42" },
      );
    } catch {}
    setSelection(null);
    setNote("");
    setNoteMode(false);
  }

  async function ask(
    prefill?: string,
    scopeOverride?: "selection" | "chapter" | "book",
  ) {
    const prompt = (prefill || question).trim();
    if (!prompt) return;
    setAsking(true);
    setAnswer("");
    setQuestion("");
    setRightOpen(true);
    const activeScope = scopeOverride || scope;
    setScope(activeScope);
    let context =
      activeScope === "selection"
        ? selection?.text || highlights.at(-1)?.text || ""
        : chapterText;
    if (activeScope === "book")
      context = retrieve(bookIndex, prompt)
        .map((item) => `[${item.label}]\n${item.text}`)
        .join("\n\n");
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, context, scope: activeScope }),
    });
    if (!response.body) {
      setAnswer("AI 服务暂时不可用。");
      setAsking(false);
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setAnswer((text) => text + decoder.decode(value, { stream: true }));
    }
    setAsking(false);
  }

  if (error)
    return (
      <main className="center-state">
        <p>{error}</p>
        <Link className="primary-button" href="/">
          返回书架
        </Link>
      </main>
    );
  return (
    <main
      className={`reader-shell theme-${settings.theme} ${leftOpen ? "" : "left-closed"} ${rightOpen ? "" : "right-closed"}`}
    >
      <header className="reader-topbar">
        <div className="reader-title">
          <Link className="icon-button" aria-label="返回书架" href="/">
            <Library aria-hidden="true" />
          </Link>
          <button
            className="icon-button mobile-only"
            aria-label="打开目录"
            onClick={() => setLeftOpen(true)}
          >
            <List aria-hidden="true" />
          </button>
          <div>
            <strong>{book?.title || "正在打开…"}</strong>
            <span>{chapter}</span>
          </div>
        </div>
        <div className="reader-actions">
          <button
            className="icon-button"
            aria-label="打开排版设置"
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <Settings2 aria-hidden="true" />
          </button>
          <button
            className="icon-button desktop-only"
            aria-label={leftOpen ? "收起目录" : "展开目录"}
            onClick={() => setLeftOpen(!leftOpen)}
          >
            {leftOpen ? (
              <PanelLeftClose aria-hidden="true" />
            ) : (
              <PanelLeftOpen aria-hidden="true" />
            )}
          </button>
          <button
            className="icon-button"
            aria-label={rightOpen ? "收起 AI" : "打开 AI"}
            onClick={() => setRightOpen(!rightOpen)}
          >
            <MessageSquare aria-hidden="true" />
          </button>
        </div>
        {settingsOpen && (
          <SettingsPanel
            settings={settings}
            setSettings={setSettings}
            close={() => setSettingsOpen(false)}
          />
        )}
      </header>
      <aside className={`toc-panel ${leftOpen ? "open" : ""}`}>
        <div className="panel-head">
          <div>
            <span>目录</span>
            <strong>{book?.title}</strong>
          </div>
          <button
            className="icon-button mobile-only"
            aria-label="关闭目录"
            onClick={() => setLeftOpen(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <nav>
          {toc.map((item) => (
            <button
              aria-current={
                item.label.trim() === chapter ? "location" : undefined
              }
              key={item.id || item.href}
              onClick={() => {
                rendition.current?.display(item.href);
                if (innerWidth < 768) setLeftOpen(false);
              }}
            >
              {item.label.trim()}
            </button>
          ))}
        </nav>
        {highlights.length > 0 && (
          <div className="highlights-list">
            <span>划线 · {highlights.length}</span>
            {highlights
              .slice()
              .reverse()
              .map((h) => (
                <button
                  key={h.id}
                  onClick={() => rendition.current?.display(h.cfi)}
                >
                  <Highlighter aria-hidden="true" />
                  <span>{h.text}</span>
                </button>
              ))}
          </div>
        )}
      </aside>
      <section className="reading-stage">
        <div ref={viewer} className="epub-viewer" />
        <button
          className="page-turn prev"
          aria-label="上一页"
          onClick={() => rendition.current?.prev()}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          className="page-turn next"
          aria-label="下一页"
          onClick={() => rendition.current?.next()}
        >
          <ChevronRight aria-hidden="true" />
        </button>
        {selection && (
          <div className="selection-toolbar">
            <button onClick={() => saveHighlight(false)}>
              <Highlighter aria-hidden="true" />
              高亮
            </button>
            <button onClick={() => setNoteMode(true)}>
              <StickyNote aria-hidden="true" />
              笔记
            </button>
            <button
              onClick={() => {
                setScope("selection");
                void ask(`请解释这段话：${selection.text}`);
              }}
            >
              <Bot aria-hidden="true" />问 AI
            </button>
            <button
              className="icon-button"
              aria-label="关闭划线工具"
              onClick={() => setSelection(null)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        )}
        {noteMode && (
          <div className="note-popover">
            <label htmlFor="note">给这段原文记一句话</label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="写下你的理解…"
            />
            <div>
              <button
                className="secondary-button"
                onClick={() => setNoteMode(false)}
              >
                取消
              </button>
              <button
                className="primary-button"
                onClick={() => saveHighlight(true)}
              >
                保存笔记
              </button>
            </div>
          </div>
        )}
      </section>
      <aside className={`ai-panel ${rightOpen ? "open" : ""}`}>
        <div className="panel-head">
          <div>
            <span>AI 阅读伙伴</span>
            <strong>围绕原文想深一步</strong>
          </div>
          <button
            className="icon-button mobile-only"
            aria-label="关闭 AI 面板"
            onClick={() => setRightOpen(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="scope-tabs" aria-label="AI 上下文范围">
          {(
            [
              ["selection", "划线"],
              ["chapter", "本章"],
              ["book", "全书"],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-pressed={scope === value}
              key={value}
              onClick={() => setScope(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ai-content">
          {answer ? (
            <ReactMarkdown>{answer}</ReactMarkdown>
          ) : (
            <div className="ai-empty">
              <BookOpen aria-hidden="true" />
              <h2>从原文出发</h2>
              <p>
                选中一句难懂的话，或直接询问当前章节。回答会严格围绕你正在读的内容。
              </p>
              <button
                onClick={() =>
                  void ask("这一章最重要的三个观点是什么？", "chapter")
                }
              >
                概括本章重点
              </button>
              <button
                onClick={() =>
                  void ask("作者的论证有哪些隐含前提？", "chapter")
                }
              >
                检查论证前提
              </button>
            </div>
          )}
          {asking && (
            <span className="streaming">
              <Loader2 className="spin" aria-hidden="true" />
              正在结合原文思考…
            </span>
          )}
        </div>
        <div className="ai-composer">
          <textarea
            aria-label="向 AI 提问"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask();
              }
            }}
            placeholder={
              scope === "selection"
                ? "针对最近划线提问…"
                : scope === "chapter"
                  ? "针对当前章节提问…"
                  : "从全书中寻找答案…"
            }
          />
          <button
            className="send-button"
            aria-label="发送问题"
            disabled={asking || !question.trim()}
            onClick={() => void ask()}
          >
            {asking ? (
              <Loader2 className="spin" aria-hidden="true" />
            ) : (
              <SendHorizontal aria-hidden="true" />
            )}
          </button>
        </div>
      </aside>
    </main>
  );
}

function findToc(items: any[], href: string): any {
  for (const item of items) {
    if (href?.includes(item.href?.split("#")[0])) return item;
    const child = findToc(item.subitems || [], href);
    if (child) return child;
  }
}
function retrieve(index: { label: string; text: string }[], prompt: string) {
  const words = prompt
    .toLowerCase()
    .split(/\s+|[，。？！、]/)
    .filter((w) => w.length > 1);
  return [...index]
    .map((item) => ({
      ...item,
      score: words.reduce(
        (n, word) => n + (item.text.toLowerCase().includes(word) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => ({ label: item.label, text: item.text.slice(0, 9000) }));
}

function SettingsPanel({
  settings,
  setSettings,
  close,
}: {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  close: () => void;
}) {
  return (
    <section className="settings-panel" role="dialog" aria-label="排版设置">
      <div className="panel-head">
        <strong>排版设置</strong>
        <button
          className="icon-button"
          aria-label="关闭排版设置"
          onClick={close}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <label>
        字号 <output>{settings.fontSize}px</output>
        <input
          type="range"
          min="14"
          max="22"
          value={settings.fontSize}
          onChange={(e) =>
            setSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))
          }
        />
      </label>
      <label>
        行高 <output>{settings.lineHeight.toFixed(1)}</output>
        <input
          type="range"
          min="1.5"
          max="2.1"
          step="0.1"
          value={settings.lineHeight}
          onChange={(e) =>
            setSettings((s) => ({ ...s, lineHeight: Number(e.target.value) }))
          }
        />
      </label>
      <label>
        页宽 <output>{settings.width}px</output>
        <input
          type="range"
          min="560"
          max="800"
          step="40"
          value={settings.width}
          onChange={(e) =>
            setSettings((s) => ({ ...s, width: Number(e.target.value) }))
          }
        />
      </label>
      <div className="segmented">
        <button
          aria-pressed={settings.font === "serif"}
          onClick={() => setSettings((s) => ({ ...s, font: "serif" }))}
        >
          宋体
        </button>
        <button
          aria-pressed={settings.font === "sans"}
          onClick={() => setSettings((s) => ({ ...s, font: "sans" }))}
        >
          黑体
        </button>
      </div>
      <div className="theme-buttons">
        <button
          aria-label="亮色主题"
          aria-pressed={settings.theme === "light"}
          onClick={() => setSettings((s) => ({ ...s, theme: "light" }))}
        >
          <Sun aria-hidden="true" />
        </button>
        <button
          aria-label="护眼主题"
          aria-pressed={settings.theme === "sepia"}
          onClick={() => setSettings((s) => ({ ...s, theme: "sepia" }))}
        >
          <Coffee aria-hidden="true" />
        </button>
        <button
          aria-label="深色主题"
          aria-pressed={settings.theme === "dark"}
          onClick={() => setSettings((s) => ({ ...s, theme: "dark" }))}
        >
          <Moon aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
