import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "三國修仙 - 回合制布陣策略 Web 遊戲",
  description: "結合三國名將與修仙神通的回合制布陣策略 Web MVP。水墨寫意畫風 + 現代策略清晰度。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="dark">
      <body className="bg-zinc-950 text-stone-100 min-h-screen font-sans antialiased selection:bg-amber-500 selection:text-zinc-950">
        {children}
      </body>
    </html>
  );
}
