import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "QMReader Books", template: "%s · QMReader Books" },
  description: "上传一本电子书，边读、边划线、边与 AI 对话。",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#f7f4ed", colorScheme: "light dark" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
