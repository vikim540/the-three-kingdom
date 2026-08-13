# 《三國修仙》MVP 專業評審報告

> 評審角度：獨立遊戲專業開發者（遊戲性 + 工程專業度）
> 評審範圍：`src/` 全量原始碼、設計文件、運行流程（無任何代碼修改）
> 日期：2026-08-13

---

## 一、總評（Executive Summary）

**這不是一個「遊戲」，而是一個外殼相當漂亮、內核卻是「技術演示 + 互動敘事片段」的原型。**

- 從**玩家視角**：核心戰鬥是兩套相互矛盾的「腳本結局」，玩家在戰鬥中幾乎沒有決策權。名將「因特性產生完全不同的通關方式」這個核心承諾，目前只兌現了 2/4，且都是「一鍵觸發」而非「考驗佈陣的策略」。
- 從**工程視角**：分層意圖是正確的（Next / Phaser / Zustand / Drizzle 各自有定位），但執行面出現了多處專業開發者會立刻搖頭的硬傷——**坐標系精神分裂、雙戰鬥系統互相打架、每幀重建物件與 tween 洩漏、大量死代碼與魔法數字**。

結論：**目前處於「可演示、不可玩、不可維護」階段。** 評審認定的關鍵路徑是——先把地基（坐標模型 + 單一戰鬥真相源）修對，否則往後所有玩法擴充都會建在流沙上。

---

## 二、遊戲性（Gameplay）短板 — 從設計 / 玩家角度

### 1. 「策略」是假的，名將差異形同虛設
- 設計書承諾「因名將特性產生完全不同的通關方式與收益」。實際上 4 選 1 名將，**只有黃忠（草叢秒殺）、夏侯惇（相鄰援護）有腳本化行為**，且都是「放對位置 → 點開戰 → 自動演出」，**不考驗任何佈陣取捨**。
- 趙雲（`PIERCE_CHARGE`）、郭嘉（`FREEZE_CONTROL`）的技能 `effectType` **在 `CombatSystem` 裡從未被任何分支引用**（見 `src/game/systems/CombatSystem.ts` 全文）。若玩家選了這兩名，他們只是「數值稍好的普通攻擊手」。**這是「虛假選項」——比沒有選擇更傷玩家信任。**

### 2. 戰鬥中沒有玩家 agency（代理感）
- 開戰後是「每 1 秒自動模擬一回合」或「一段時間軸演出」。`RadialCommandMenu` 的 技能 / 道具 / 撤退（`src/app/game/page.tsx` `handleExecuteAction`）**只是 `addCombatLog` + 一點微小效果，完全沒有接入 `executeBattleStep`**——`activeAction` 在模擬裡被徹底忽略。
- 也就是說：**「回合制」只是演出節奏，不是決策循環。** 玩家點完「開戰」就只能在旁邊看。

### 3. 佈陣深度幾乎為零
- 設計規範寫「8×8」，程式實作是 `MAP_COLS=4, MAP_ROWS=10`（`src/game/config/constants.ts`）——**文件與實作脫節**，且 4 格寬的地圖本身就談不上「布陣」。
- 地形系統 `TERRAIN_EFFECTS` 定義了 `defBonus` / `moveCost` / `ambushable`，但**這些欄位在移動與戰鬥代碼中從未被讀取**（`AmbushSystem.isUnitInBush` 只判斷 `terrain==="BUSH"`，`CombatSystem` 的移動用 `Math.sign` 一步走、完全忽略障礙與移動成本）。草叢、岩石、逃生陣都是**死數據**。

### 4. 沒有數值與平衡
- 傷害公式：`rawDamage = Math.max(5, atk - Math.floor(def/2))`（`CombatSystem.ts:145`）。**無方差、無暴擊、無技能乘區、無屬性克制**。
- 伏擊秒殺寫死 `9999`（`CombatSystem.ts:34`、`BattleScene.ts:451`）。
- 沒有成長曲線、沒有關卡難度、沒有失敗懲罰（失敗只是彈結算 Modal）。

### 5. 養成是空殼
- `spiritStones` / `exp` / 品質 / 背包（`InventoryModal`、`useInventoryStore`）都被 UI 展示，**但沒有任何消耗、升級、裝備邏輯**。
- DB 有 `players` / `unlockedHeroes` 表，但 `gameData` 永遠寫 `{}`（`src/app/api/save/route.ts` POST 傳 `gameData: {}`）。**所謂「Drizzle 平滑遷移 Postgres 相容」只是口號，因為根本沒存遊戲狀態。**

### 6. 重玩價值為零
- 一關、一種敵人配置、兩種結局、無隨機性、無分支、無收藏驅動。關掉網頁再打開就回到召喚畫面。

---

## 三、工程 / 專業度短板 — 從工程角度（附證據）

### 🔴 P0 致命（會讓遊戲行為錯亂 / 不可預測）

**A. 坐標系精神分裂（`BattleUnit.x/y` 既是 0~1 歸一化，又是 0~9 網格整數）**
- 敵人出生用歸一化：`page.tsx:99` `0.38 + i*0.06, 0.22 + (i%2)*0.05`
- 渲染層把歸一化當像素：`BattleScene.updateUnitsVisual:187` `unit.x <= 1.0 ? unit.x * sw : unit.x`
- 戰鬥層把 `x/y` 當整數網格：`AmbushSystem.isUnitInBush` `tiles.find(t => t.x === unit.x && t.y === unit.y)`
- **後果**：`isUnitInBush` 永遠比對不上（整數網格 vs 浮點歸一化），導致 `executeBattleStep` 裡「真·伏擊秒殺」分支在真實運行中**永遠不觸發**。遊戲之所以「看起來能玩」，是靠 `BattleScene` 裡另一套寫死 `unit.x >= 0.60` 的視覺腳本撐著。這是整個專案最致命的設計錯誤。

**B. 雙戰鬥系統同時運行、互相打架**
- `page.tsx:215 runBattleLoop` 每 1 秒 `executeBattleStep` 改寫 `units` / `phase`（網格語義）。
- `BattleScene:53` 訂閱 `phase` 變化，再跑 `executeTacticalCombatSequence` 用 `delayedCall` 改寫**同一個 store**（歸一化 + `statusEffects` 語義）。
- 兩套結局判定競爭寫入 `phase`，**行為不可預測、非冪等**。這是「視覺演出層」與「模擬邏輯層」沒有分離的典型症狀：正確做法應是 **simulation 算出結果 → view 只 playback**。

**C. 訂閱洩漏 + 場景重啟**
- `BattleScene.create()` 每次重建都 `useBattleStore.subscribe(...)` 卻**從不 unsubscribe**（`BattleScene:53`）。
- `this.scale.on("resize", () => this.scene.restart())`（`BattleScene:66`）：每次 resize 重啟整個場景 → 訂閱與 tween 不斷累積。

### 🟠 P1 嚴重（性能 / 正確性）

**D. 每幀重建容器 + 無限 tween 洩漏**
- `updateUnitsVisual` 在**每次 store 變化（包含每一條戰鬥 log）**都調 `buildLive2DCharacter` → `container.removeAll(true)` 後重建所有 Graphics / Text，並 `tweens.add` 一個 `repeat:-1` 的呼吸動畫（`BattleScene:270`）。**每次都新建、從不 kill 舊 tween**。一場戰鬥下來 tween / 物件數量線性膨脹，久玩必卡甚至崩。

**E. 戰鬥迴圈無清理**
- `runBattleLoop` 的 `setInterval` 在組件卸載時**沒有 `clearInterval`**；`handleStartBattle` 可被重複點擊，啟動多條 interval 同時跑、互相覆寫 `units`。

**F. 敵人出生座標與關卡配置脫鉤**
- `STAGE_1_BANDIT.enemies` 定義了網格座標 `(1,1)(0,0)(2,0)...`，但 `initBattleUnits` **完全忽略**，改用寫死歸一化 `0.38+i*0.06`（`page.tsx:98-100`）。關卡配置形同廢紙。

**G. 兩套並行地圖表示互相矛盾**
- `level_1_polygons.json`（歸一化多邊形，Dev 編輯器用）vs `stages.ts` 的 4×10 網格。
- 伏擊判定一個用 `isPointInPolygon`（polygon），一個用網格比對，**彼此不一致**；Dev 編輯器把 region 寫回 JSON 檔案（`/api/level/regions` POST），與實際戰鬥使用的網格**毫無關聯**——編輯器是「玩具」，不是生產工具。

### 🟡 P2 中（可維護性 / 專業度）

**H. 魔法數字與硬編碼邏輯散佈**
- `9999`、`0.75`、`0.60`、`0.38+i*0.06`、`0.12/0.72`、`def*1.4`……
- 「40% 減傷」出現在兩個**含義不同**的地方：場景文案說「豁免 40%」（`BattleScene:512`），代碼做的是 `effectiveDef*1.4`（等價「受到的傷害 ÷1.4 ≈ 減傷 28.5%`）。**語意不一致**。沒有 `balance` / `constants` 模組。

**I. 死代碼（Dead Code）**
- `src/components/game/CombatLog.tsx`、`src/components/game/BattleHUD.tsx` **從未被任何地方 import**。
- `TERRAIN_EFFECTS.FOREST / ESCAPE / defBonus / moveCost` 從未被讀取。
- 趙雲 / 郭嘉 skill `effectType` 從未在 `CombatSystem` 分支。
- `STAGE_1_BANDIT.enemies` 座標未被使用。
- `useDevStore` 的 region 系統在真實玩法中沒有消費者。

**J. 行為用 if 鏈硬編，無資料驅動**
- 新增一個名將就要改 `CombatSystem` 加 `if`。專業做法應是 `effectType → 技能處理器表`（策略模式 / 數據表），讓策劃能調配而不動邏輯。

**K. 運行時摳圖（`removeImageBackground`）**
- 每次開機對每張立繪跑一次全像素泛洪填充 + 二次掃描（`src/game/utils/imageChromaKey.ts`，O(w·h)）。若資源已是透明 PNG 就純浪費；若不是，應在**構建期 / 美術管線預處理**，而非在玩家裝置上每局首次載入時卡頓。這是用代碼補美術短板的權宜之計。

**L. 設計文件與實作脫節（反模式）**
- `AGENTS.md` / `project_rules.md` 寫「8×8」，程式是 4×10；`tech_stack.md` 說 `better-sqlite3`，依賴是 `@libsql/client`；`changelog.md` 只有一條 `build`。
- 這是「先寫好看的規範、再寫會跑的玩具」的典型 intern 反模式——規範用來「看起來專業」，但沒有反向約束程式。

---

## 四、專業開發規劃（Roadmap）

> 每階段標註「做到什麼程度算合格」。優先級自上而下。

### Phase 0 — 地基重構（必須，否則後面都白搭）｜預估 1~2 週
**目標：讓「單位位置」和「戰鬥結果」各自只有一種真相。**
1. **統一坐標模型**：`BattleUnit.x/y` 只用整數網格 `(col,row)`。新增 `rendering` 層 `gridToScreen(col,row)` 與 `input` 層 `screenToGrid(px,py)`。徹底刪除歸一化座標。
2. **單一戰鬥真相源**：`CombatSystem` 成為唯一模擬，輸出**「戰鬥事件流」**（如 `UNIT_MOVED` / `ATTACK` / `SKILL_TRIGGERED` / `UNIT_DIED`）；`BattleScene` 只 playback 事件。**移除 `executeTacticalCombatSequence` 的獨立判定。**
3. **生命週期治理**：訂閱對稱 unsubscribe；resize 不再 `scene.restart()`（改用 `scale.resize` + 重新佈局）；`buildLive2DCharacter` 只在「首次建立」與「狀態變更」時更新，呼吸動畫只建一次；`runBattleLoop` 的 interval 在卸載 / 重開時清理。
4. **合格標準**：拖拽佈陣後，模擬讀到的座標與畫面一致；控制台無重複訂閱 / 無累積 tween；resize 不重置戰鬥。

### Phase 1 — 讓它「真的能玩」｜預估 2~3 週
1. **真正的回合制 loop**：玩家下指令（移動 / 攻擊 / 技能 / 道具）→ 結算 → 敵方 AI → 結算。`activeAction` **必須接入模擬**（目前被忽略）。
2. **地形真正生效**：移動成本、防禦加成、視野 / 伏擊由 `BUSH` 網格決定；**去掉 polygon 雙軌，統一用網格**（Dev 編輯器要麼對接網格、要麼砍掉）。
3. **數值公式**：攻擊 / 防禦 / 暴擊 / 技能乘區 / 方差；建立 `balance` 常量表；先做 3~5 個可調參數驗證手感。
4. **兌現名將差異**：實作趙雲 / 郭嘉技能（用 `effectType` → 處理器表），或先從選項中移除，杜絕「虛假選項」。
5. **合格標準**：同一關卡，不同佈陣 / 不同指令會導致不同勝負；數值可由 config 調整且不改邏輯。

### Phase 2 — 養成與進度｜預估 2~3 週
1. 資源 / 經驗 / 升級**真的影響數值**；背包道具**真的可消耗**；`unlockedHeroes` 真的多角色可用。
2. **真存檔**：把戰鬥 / 佈陣 / 資源寫進 `gameData`（JSON 或正規欄位），做到「關掉網頁再回來還在原地」。
3. **合格標準**：存檔可完整還原遊戲狀態；養成數值對戰鬥有可感知影響。

### Phase 3 — 內容與重玩｜持續
1. 關卡**數據化**（`stages` 表驅動），做 3~5 關 + 敵人變體 + 難度曲線。
2. 失敗有意義（重試 / 代價）；分支結局由**玩家決策**驅動，而非腳本。
3. 美術管線：預處理透明圖，**去掉運行時摳圖**。

### Phase 4 — 打磨｜持續
- 可訪問性、手感、動畫節奏、音效、平衡測試（建一個離線數值模擬器跑大量對局驗證平衡）。

---

## 五、給實習生 / 團隊的具體建議

1. **先寫「戰鬥模擬純函數」，再做畫面。** 模擬不依賴 Phaser / React，可單測、可離線跑。
2. **一切座標只有一種表示（網格）。** 歸一化只允許存在「渲染 / 輸入轉換」層，絕不進入遊戲狀態。
3. **魔法數字全部進 config；行為用資料表驅動。** 讓策劃能調，讓邏輯穩定。
4. **訂閱 / 計時器 / 場景都有對稱的釋放**（subscribe↔unsubscribe、setInterval↔clearInterval、create↔destroy）。
5. **文件與程式同步**：改了 4×10 就改文件；依賴換了就改 ADR。規範是約束，不是裝飾。
6. **「看起來能玩」≠「能玩」。** 在 `executeBattleStep` 與 `BattleScene` 打架的階段，遊戲靠視覺腳本撐著——這種僥倖必須在 Phase 0 根除。

---

### 附：優點（客觀肯定）
- 技術選型方向正確（Next App Router + Phaser 動態載入解耦 + Zustand + Drizzle），架構分層有意圖。
- UI / 視覺打磨用心（扇形手牌、水墨風 HUD、對話演出、載入動畫），說明團隊有產品感與美術協作意識。
- 類型定義（`HeroConfig` / `BattleUnit` / `GridTile`）結構清晰，為後續重構提供了良好骨架。
- 這份「好看的外殼 + 錯的內核」恰好說明：**問題不在審美與工程品味，而在「模擬與表現分離」這條核心紀律沒有守住。** 修對地基後，外殼的投入才不會白費。
