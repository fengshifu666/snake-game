import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snake Rush Arena",
  description: "支持注册登录与排行榜的网页版贪吃蛇小游戏。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
