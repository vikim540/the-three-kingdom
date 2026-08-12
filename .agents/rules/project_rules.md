# 《三國修仙》專案開發規範 (Project Rules)

## 一、技術棧約束 (Tech Stack Constraints)
- **框架**：Next.js 最新版 (App Router)，嚴禁使用 Pages Router。
- **語言**：TypeScript Strict 模式，嚴禁使用 `any`（必要時使用 `unknown`）。
- **UI & 樣式**：React 19 + Tailwind CSS v4。優先使用 Tailwind 工具類，禁止在元件內寫大段 inline style 或新建 `.module.css`。自訂樣式統一寫在 `src/app/globals.css` 的 `@layer` 中。
- **遊戲引擎**：Phaser 3/4 僅在 Client Component 中經由 `next/dynamic` (`ssr: false`) 動態載入。Phaser 專注於畫布與戰鬥邏輯，所有選單、對話、卡牌選擇與 HUD 用 React + Tailwind 實作，嚴禁在 Phaser 場景內操作 DOM。
- **資料庫與 ORM**：SQLite (LibSQL / better-sqlite3) + Drizzle ORM。主鍵統一使用 text (`cuid2` / `ulid`)，Schema 需設計為 PostgreSQL 平滑遷移相容。
- **狀態管理**：Zustand。
- **包管理器**：`pnpm`（強制使用）。
- **代碼規範**：ESLint + Prettier。

## 二、資料夾與檔案紀律 (Directory Discipline)
- 禁止隨意在根目錄或 `src/` 建立說明文件、臨時筆記或測試腳本。
- 所有設計、架構說明與決策記錄統一放在 `/docs` 目錄（如 `/docs/design/`, `/docs/decisions/`）。
- 所有遊戲 2D 美術圖案資材統一放置於 `/public/assets/` 目錄（WebP 格式）。

## 三、生成資源與存儲路徑 (Storage & Artifact Directory)
- **硬碟空間保護**：本專案所有生成的備份檔案、圖片資材、日誌與臨時產出，**統一指定放置於 D 盤目錄**：
  `D:\AI\antigravity\brain\e4b02c72-40ea-4495-98c7-9012a6cf719d\`
- 嚴禁在 C 盤留存大型編譯日誌或生成圖檔。

## 四、Git 提交規範 (Git Commit Standards)
強制採用 Emoji + Conventional Commits：
- ✨ `feat:` 新功能
- 🐛 `fix:` 修復 Bug
- 🎨 `style:` 純樣式/美術資材變更
- ♻️ `refactor:` 重構
- 📦 `build:` 建構/依賴相關
- 🔧 `chore:` 雜項
- 📝 `docs:` 文件（只限 `/docs`）
- 🎮 `game:` 遊戲戰鬥邏輯專用

目標分支：`antigravity`

## 五、遊戲 MVP 規則 (Gameplay Rules)
- 地圖尺寸：8×8
- 地形：普通平地、密草叢（伏擊）、崎嶇岩石（障礙）
- 雙分歧通關：
  - 黃忠路線：草叢伏擊 + 主角假逃誘敵 → 「猛將一箭」秒殺敵首，其餘劫匪潰逃 → 稀有修仙丹藥。
  - 夏侯惇路線：主角相鄰 1 格觸發「鐵血援護」減傷 → 正面全滅 5 名劫匪 → 全額常規物資。
