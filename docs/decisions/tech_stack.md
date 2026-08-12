# 技術決策記錄 (ADR 001)

## 核心選擇
1. **Next.js 15+ (App Router)** + **TypeScript Strict Mode**：確保元件 SSR / Client Component 明確分工，全型別覆蓋。
2. **Tailwind CSS v4** + **React 19**：使用 CSS v4 `@import "tailwindcss";` 原生升級，純工具類排版。
3. **Phaser 3/4**：採用 `next/dynamic` (`ssr: false`) 動態載入，與 React UI 完全解耦，透過 Event Emitter 與 Zustand 進行雙向狀態同步。
4. **Drizzle ORM + better-sqlite3**：選用獨立性高的 SQLite Schema，PK 全數採用 `text(ulid / cuid2)`，可無縫切換 PostgreSQL。
