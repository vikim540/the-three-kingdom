import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "开发模式",
  description: "三國修仙傳 - 戰術布陣修仙遊戲開發模式",
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
