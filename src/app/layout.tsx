import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "三國修仙 - 回合制布陣策略 Web 遊戲",
  description: "結合三國名將與修仙神通的回合制布陣策略 MVP。體驗黃忠草叢伏擊與夏侯惇正面硬剛的雙重戰略樂趣！",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-amber-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
