import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6 text-center">
      <h2 className="text-4xl font-black text-amber-400 mb-2">404 - 迷失修仙大陸</h2>
      <p className="text-sm text-slate-400 mb-6">您所存取的陣圖頁面不存在或已被仙法遮蔽。</p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-xl font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition text-sm shadow-lg"
      >
        返回修仙主選單
      </Link>
    </div>
  );
}
