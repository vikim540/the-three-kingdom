import type { Metadata } from "next";
import { Noto_Serif_TC, Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif_TC({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-noto-serif",
});

const notoSans = Noto_Sans_TC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans",
});

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
    <html lang="zh-TW" className={`dark ${notoSerif.variable} ${notoSans.variable}`}>
      <body className="bg-zinc-950 text-stone-100 min-h-screen font-sans antialiased selection:bg-amber-500 selection:text-zinc-950">
        {children}
      </body>
    </html>
  );
}
