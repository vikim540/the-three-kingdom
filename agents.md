# agents.md — 本项目 Agent 工作规范（环境 + 游戏开发红线）

> 双重用途：(1) 让后续 agent 会话直接复用本机工具链，**不要重复装环境到 C 盘**；(2) 锁定「三国 4X 策略游戏（sankingdom）」的开发红线与协作规则，**避免后期数据填充时灾难性返工**。
> 本文件是 Agent 的**最高优先级指令**，开工前必读；任何新需求先对照「强制异议与确认规则」自检。

---

# 一、环境工具链规范（避免重复安装、禁止占用 C 盘）

> 结论先行：本机所有开发工具链与缓存**已经全部在 D 盘 `D:\AI`**，且 PATH 已引用。缺什么先查 `D:\AI`，不要急着 `npm i -g` / 重装。

## 硬规矩
- **禁止把任何环境、依赖、缓存装到 C 盘**（`C:\Program Files`、`C:\Users\...\AppData` 等）。
- 一切安装/缓存默认落到 `D:\AI`（已配置好）。项目本体在 `D:\000waicun\...`（D 盘），本地 `npm install` 本来就落在 D 盘，没问题。
- 网络可达（npm registry = https://registry.npmjs.org/）。

## 已就绪的工具链（均在 D 盘，PATH 已引用）
| 工具 | 路径 / 版本 | 备注 |
|---|---|---|
| Node.js | WorkBuddy 托管：`C:\Users\李威俊\.workbuddy\binaries\node\versions\22.22.2`（v22.22.2）；系统：`D:\Program Files\nodejs` | 优先用这两个，**不要**往 C 盘新装 node |
| npm | 全局 prefix = `D:\AI\Cache\npm-home`；cache = `D:\AI\Cache\npm-cache` | 已是 D 盘全局家目录，直接 `npm i` 即可 |
| pnpm | home = `D:\AI\Cache\pnpm-home\bin`（含 pnpm/pnpx） | 想隔离依赖时用 pnpm，store 也在 D 盘 |
| git | `D:\AI\Tools\Git`（v2.48.1.windows.1） | PATH 已含 |
| Python / uv | `D:\AI\Tools\uv`（uv 0.11.16） | Python 环境一律用 uv，别碰 C 盘系统 Python |
| Rust | `D:\AI\Runtime\rust\cargo\bin`（cargo 1.93.0） | |
| Go | `D:\AI\Runtime\go`（gopath/bin 在 PATH） | |
| 其它 | `D:\AI\Tools` 下另有 VS Code、PowerShell、ripgrep、`D:\AI\Runtime` 等 | 探索新工具先翻 `D:\AI\Tools` / `D:\AI\Runtime` |

## 已知坑与 workaround
- **npm 在 `D:\AI\Cache\npm-cache` 偶发 EPERM**（沙箱写 D 盘缓存被拒）。解决：`npm install --cache ./npm-cache`（用工作区内本地缓存）即可正常装。装完可删本地缓存。
- pnpm 若报找不到 node，确认 PATH 里 node 在前（`D:\Program Files\nodejs` 或 WorkBuddy 托管 node）。

## 构建相关坑（Vite / 前端）
- **`vite build` 清空 `dist` 会卡死**：本机 node 的文件删除被 shim 成 `genie-trash` 安全删除工具，该工具在 Windows 上偶发 `ETIMEDOUT` / `EPERM`（"这个系统不支持该功能"）。现象：`vite build` 在 emptying outDir 阶段失败。
  - 解决：在 `vite.config.ts` 设 `build: { emptyOutDir: false }`（原地覆盖产物，hash 文件名自动失效旧资源，无残留风险）；要彻底清 `dist` 时用 **shell `rm -rf dist`**（走系统 rm，不触发 trash shim），不要用 node `fs.rm` / 系统删除 UI。
- Vite 默认不需要 `postcss.config` / `tailwind.config`：Tailwind v4 用 `@tailwindcss/vite` 插件即可，内容文件自动扫描。

## 环境自检命令（需要时跑）
```
npm config get prefix   # 应为 D:\AI\Cache\npm-home
npm config get cache    # 应为 D:\AI\Cache\npm-cache
which node npm pnpm git uv cargo go
```
只要 prefix/cache 指向 `D:\AI`，就说明环境已就位，直接复用，别重装。

---

# 二、游戏开发硬性规范（sankingdom · 三国 4X）

## 2.1 技术栈（既定，勿擅自更换）
- 前端：**TailwindCSS v4（@tailwindcss/vite 插件，零 postcss 配置）+ 组件化封装**；构建 Vite；语言 TypeScript（严禁 JS）。
- 数据/逻辑层：`src/data`（类型+剧本 JSON 化）、`src/sim`（纯 TS 模拟核心，零渲染依赖，可单测）。
- 视图层：`src/view`（Canvas2D，是当前视图实现；**换 Phaser4 只动这一层**）。
- 数据库：**初版 SQLite，预留 PostgreSQL 迁移兼容能力**（详见 §2.5，注意运行时冲突）。

## 2.2 核心主线（玩法阶梯，底层数据模型全程不变）
> 家庭织席贩履 → 非线性树状奇遇 → 村落/亭/乡/县/郡层级经营 → 动态事件/危机张力 → 黄巾起义起兵争霸

## 2.3 全局红线（不可违反）
1. **禁止硬编码常量（集中落 `src/data/config.ts`）**：官职阈值、村落名单（主角本村 `HOME_VILLAGE_ID`）、权限开关、赋税区间（含布衣本村税上限）、升级数值（等级乘数 / 升级阈值）、提示文案、资源显示命名**全部写入 `src/data/config.ts` 单一全局配置**，业务代码（engine / hud / radialMenu / dashboard）仅读取变量渲染，页面/组件不写死。
2. **禁止重复造轮子**：同类功能只实现一次，全业务复用公共组件（见 §2.6 白名单）。
3. **通用交互全复用公共组件**：弹窗、Tab、轮盘、标签、卡牌、分支树、时间、空地面板，禁止每处各写一套。
4. **初期仅开发刘备关联点位 / NPC**：非刘备相关人物默认标记「待开发」，不因「顺手」铺开其他线。
5. **模拟核心从第一天起不依赖渲染/UI 框架**（保证可换引擎、可单测）。

## 2.4 UI & 交互开发细则（含现状审阅标注）
> 图例：✅已落地　🟡部分落地/写法不达标　❌未做　⚠️冲突/需确认

1. **右下角固定资源看板组件** — ✅ `src/ui/dashboard.ts`
   - 全局固定悬浮右下角，Tailwind 过渡动画（hover 高亮、选中 Tab `scale-105`）；默认核心数据，内置 Tab：概况/建筑/升级。
   - 空地点选调用统一建造弹窗；建筑比例按「里<亭<乡<县」（`TIER_PLOTS` 常量，层级派生不落字段）。数值全在 `types.ts`，页面无写死。

2. **悬浮操作轮盘** — ✅ `src/ui/radialMenu.ts`（**拖拽定位 bug 已修**）
   - 修复要点：`main.ts` 中 `view.onRender = () => radial.reposition()`，轮盘每帧按 `view.screenPos(id)` 重新定位，拖拽/缩放不再偏移。
   - 交互：移入呼出、图标下配文字、hover 功能项 `scale-125` 放大、点击唤起全局弹窗；过渡全用 Tailwind `transition`/`transition-transform`。

3. **全局通用弹窗组件** — ✅ **已统一（P0 完成，`src/ui/modal.ts`）**
   - 现状（已消除）：原 `hud.ts#detailModal`（维度详情）、`heroCards.ts#layer`（人物志）、`dashboard.ts` 内嵌建筑选择弹窗，三处各自重写「遮罩+居中卡+关闭+Esc」基建，违反红线②。
   - 现状（已落地）：抽到 **`src/ui/modal.ts`**，导出 `openModal(html, {onClose})` / `closeModal()`，统一提供「背景遮罩 + 居中卡 + 关闭按钮(`data-modal-close`) + Esc + 点遮罩关闭」，层级 `z-[70]`（高于 intro 的 z-50）。上述三处全部复用同一容器，业务侧只产出「卡片 HTML + 事件绑定」。
   - 入局背景板 `#intro`（z-50）保留为独立开场遮罩，不纳入通用弹窗。

4. **时间组件** — ✅ `src/ui/timeBar.ts`
   - 逻辑：`src/sim/engine.ts` 的 `Calendar` / `adLabel` / `dateLabel`，以 184 年黄巾起义为锚点，回合=旬、一月三旬，全局管控 ✅。
   - 显示已抽为独立 `src/ui/timeBar.ts#timeBarHTML`，顶栏统一调用，避免散落拼接硬编码。

5. **NPC 人际关系 + 人物志系统** — ✅ `src/ui/heroCards.ts`
   - 关系用分支图标树（`clanTree`，含连接线/关系徽章/状态徽章）；点击节点自动跳转对应地图点位（`focusVillage` / 切换人物志）。
   - 「待开发」状态用 `src/ui/badges.ts#statusBadge` 组件化，一处修改全局生效。
   - 人物志嵌入弹窗、支持关闭（✕/遮罩/Esc）。仅首批开放刘备线聚落与 NPC。

6. **英雄卡牌 RPG 系统** — ✅ `src/ui/heroCards.ts`
   - 独立封装卡牌组件，预留长方形立绘插槽（3:4）、五维数值条；点击切入人物专属视角，读数据展示故里/宗族（剧情文本不走硬编码，存 `scenario.heroes[].hometown`）。
   - 非刘备相关人物默认标记「待开发」（statusBadge）。

7. **空地 & 建筑系统** — ✅ `dashboard.ts` + `engine.build`
   - 层级空地容量 `TIER_PLOTS`、建造造价、升级阈值均在 `types.ts` 全局配置；点击空地触发建造，建筑数据进入状态（后续入库）；支持升级/拆除（拆除待补）。

8. **树状奇遇系统** — ✅ `src/data/types.ts`(模型) + `src/data/scenario.ts`(刘备线奇遇树) + `src/sim/engine.ts`(引擎) + `src/ui/hud.ts`(面板/弹窗)
   - 模型：`Adventure` / `AdventureNode` / `AdventureChoice` / `AdventureEffect` / `AdventureReq`；每棵奇遇为扁平节点表，用 `choice.next` 关联成分支树，最终收敛落定（主线「非线性树状奇遇」）。
   - 引擎：`adventureAvailable` / `currentAdventureNode` / `chooseAdventure`（校验前置、应用成效、推进节点）；触发判定复用 `triggerOk`（与任务共用，消除重复）。
   - 交互：左侧「📜剧情」tab 内嵌奇遇列表面板，点击复用全局弹窗（`modal.ts`）展示情境 + 分支选项，选择后弹窗幂等刷新推进；成效作用于资源/声望/Flag/解锁英雄/村落民心人口，**数据全在 `scenario.adventures`，UI 不写死**。

9. **Tab 切换容器** — ✅ `src/ui/tabs.ts`
   - 左侧面板 / 详情弹窗 / 右下看板的 Tab 切换条统一走 `ui/tabs.ts#tabBarHTML`（选中高亮 + hover `scale-105` 动效保留），禁止各面板手写重复 tab 条。
10. **锁定标签** — ✅ `src/ui/badges.ts#lockTag`
   - 权限不足（如布衣未授官的外村操作）统一用 `lockTag('晋升官职解锁')` 渲染锁定提示，三处 UI 复用，杜绝散落硬编码。

## 2.5 数据库硬性规范（⚠️ 运行时冲突，先看异议）
**意图**：雏形阶段用 SQLite 本地存储；表结构严格兼容 PostgreSQL 语法，不使用 SQLite 专属函数，后续可无缝迁移；分表：聚落表、建筑表、英雄卡牌表、NPC人际表、奇遇分支表、玩家存档表；全局配置数值禁止写死在表单条字段内。

> 🔴 **异议 / 冲突提示（AI 必须先告知用户再决定）**：
> - 当前项目是 **Vite 纯浏览器前端**，`better-sqlite3` 是 Node 专有，**浏览器内无法直接运行**。若现在强行引入会破坏纯前端部署。
> - 推荐运行时路线（择一后engine才落地）：
>   - **Cloudflare D1**（边缘 SQLite，天然契合你已规划的 Cloudflare 生态，且 SQL 标准、接近 PG 兼容方向）——最契合「单机→联网」演进；
>   - **Tauri / Electron 桌面壳** —— 可用 `better-sqlite3` 原生访问本地文件库；
>   - 纯浏览器临时方案 —— `sql.js`(WASM) 或 OPFS，仍在浏览器内。
> - **现在即可定为硬规、不依赖引擎的部分**：① 分表设计与字段命名按上面 6 张表；② 所有 SQL 用标准 DDL/DML，**禁用 SQLite 专有函数/语法**；③ 数值阈值放全局配置，不落单条记录。
> - 当前存档仍走 `src/sim/persistence.ts` 的 `StorageAdapter`（localStorage 实现），该接口已隔离存储细节——**换库只新增一个 Adapter 实现，sim-core 不动**。

## 2.6 公共组件白名单（必须复用，禁止重复开发）
| 组件 | 现状态 | 位置 |
|---|---|---|
| 资源看板 | ✅ | `ui/dashboard.ts` |
| Tab 容器 | ✅ | `ui/tabs.ts` |
| 悬浮操作轮盘 | ✅ | `ui/radialMenu.ts` |
| **全局弹窗** | ✅ | `ui/modal.ts` |
| 待开发标签 | ✅ | `ui/badges.ts#statusBadge` |
| 英雄卡牌 | ✅ | `ui/heroCards.ts` |
| 人际分支树 | ✅（暂绑 heroCards，可抽通用） | `ui/heroCards.ts#clanTree` |
| 时间组件 | ✅ | `ui/timeBar.ts` |
| 锁定标签 | ✅ | `ui/badges.ts#lockTag` |
| 空地建造面板 | ✅ | `ui/dashboard.ts` |

## 2.7 开发优先级（P0–P3，含现状）
- **P0**：① 统一全局弹窗（✅ 已完成，见 §2.4-3，`src/ui/modal.ts`）② 搭建基础数据表（✅ 已完成，见 §2.5 / `src/data/schema.sql`，六张表标准 DDL，兼容 PostgreSQL）③ 确认入局遮挡/轮盘拖拽/人物志关闭已修（✅已修，无需重做）。
- **P1**：右下角资源看板（✅）、悬浮轮盘（✅）、时间组件独立化（✅ `ui/timeBar.ts`）、**全局配置 `config.ts` + 动态分级权限系统（✅ 已落地，见 §2.8）**、Tab 容器通用化（✅ `ui/tabs.ts`）、锁定标签（✅ `ui/badges.ts#lockTag`）。
- **P2**：空地建筑系统（✅）、英雄卡牌（✅）、NPC 人际分支（✅）、**动态事件/危机系统（✅ 已落地，见 §2.10；让游戏有张力：流寇/天灾/告急/机遇，带失败条件）**。
- **P3**：联动原有四维管理模块、**树状奇遇系统**（✅ 已动工，见 §2.4-8；刘备线「织席贩履」非线性分支树已落地，成效打通资源/声望/人物）。

---

## 2.8 动态分级权限系统（精细阶梯，权限随官职递增）
> 权限判定**唯一依据**：玩家当前官职（`GameState.title`）→ `rankValue(title)`（0=布衣）。身份可随剧情 / 军功 / 经营动态晋升，权限跟随身份实时联动，不永久锁定布衣限制。

- **身份阶梯（9 档，`src/data/config.ts` 的 `IDENTITY_RANKS`，每档带 `rank: 0..7`）**：
  `布衣(0)` → `里长(1)` → `亭长(2)` → `乡佐(3)` → `乡长(4)` → `安喜县尉/县令(5)` → `太守(6)` → `州牧(7)`。
  - 解析工具：`rankValue(title)`（未知→0 布衣）、`rankName(rank)`（序位→身份名）、`isOfficial(title)=rank>=2`、`identityTier(title)=rank>=1?'official':'commoner'`。
- **权限动作矩阵 `PERM_RANK: Record<PermAction, number>`**（动作所需最低序位）：里长(1) 仅得 `安抚/断案/务农/发掘/任属吏/基础营建`；亭长(2) 开方略 `调税/征勇/招贤/通商/联防`；乡长(4) 得 `升格村落` 大权。业务侧统一走 `canAct(title, action)=rankValue>=PERM_RANK[action]`，三处 UI 不得各写判定。
- **村落可经营 `canManageVillage(title, id)`**：本村（大树楼桑里 `HOME_VILLAGE_ID`）需 `rank>=1`（里长+）；外村需 `rank>=4`（乡长+）方可辖制 —— 使「里长不管外村、亭长不管诸里、乡长才辖周边」成立，解决里长权限过高、县令/乡长无落差的问题。
- **布衣（开局默认，仅个人营生）**：
  - 左侧看板：主体为「个人营生」面板（`PERSONAL_ACTIONS`：织席贩履 / 砍柴 / 归家，均 rank0 可；祭祖聚族 rank1），**无任何村落管辖按钮**；积铜钱 ≥ `PROMOTE_LIZHANG_GOLD`(25) 后由 `checkPromotion` 自动举荐为里长；其余村落只读。
  - 悬浮轮盘 / 右下看板：同源受 `canManageVillage` / `radialMode` 闸门约束，外村仅 `进入` / `打听消息`。
- **自动晋升 `engine.checkPromotion(state)`**（在 `act` 与 `endTurn` 末调用，门槛全来自 config）：布衣+铜钱≥25 → 里长（置 `flags.rooted`）；里长+本村 Lv2 → 亭长；亭长+本村 Lv3 → 乡长。与任务链（`q_rooted`/`q_settle`/`q_merchant`）衔接，避免卡关。
- **三处同步（红线）**：同一权限限制必须在「左侧看板 + 悬浮轮盘 + 右下升级面板」同步生效，单点修改视为不合格。三处统一调用 `config.ts` 的 `canManageVillage` / `canSetTax` / `taxUpperBound` / `radialMode` / `canAct`，不得各写一套判定。
- **禁止粗暴删结构**：仅通过身份变量控制控件显隐，不得直接删除政治 / 人事 / 内政 / 外交等 Tab 骨架，保障高阶身份解锁时无缝开放功能。

---

# 五、用户明确的全局基础约定（2026-08-10 补充，与 §2 互为补充）

## 5.1 项目现状基线
- 可操控主角：**仅刘备**；其余人物统一标记「待开发」（`badges#statusBadge`）。
- 行政层级固定链路：**范阳郡 → 涿县 → 乡 → 亭 → 里**（最小操作单元为里）。
- 开局初始身份：**布衣**（无军阶 / 官职），身份可随剧情、军功动态晋升（亭长 → 乡佐 → 县令 → 太守…），全功能组件化封装，**权限跟随身份实时联动，不得永久锁定布衣限制**。

## 5.2 通用禁止红线（全迭代生效，详见 §2.3）
- 禁止硬编码（阈值 / 名单 / 权限 / 赋税 / 文案 / 升级数值 → `config.ts`）。
- 禁止粗暴删结构（仅用身份变量控显隐，保留 Tab 骨架）。
- 禁止链路割裂（三处 UI 权限同步，见 §2.8）。
- 禁止删减既定动效（hover 轮播、选中放大、弹窗过渡全部保留 Tailwind 原生动画）。
- 数据库分层建表（§2.5 六张表；权限 / 身份状态独立入库；不使用 SQLite 专属语法）。

## 5.3 界面改造 & 历史 Bug 清单
- 左侧面板：弱化冗余进度条装饰、放大核心数据字号、降低视觉杂乱；**布衣阶段锁定本村赋税上限**（`COMMONER_HOME_TAX_CAP`），禁止随意重税；刘备宗族羁绊、剧情内容保留只读展示。
- 右下看板：剥离全域汇总数据，聚焦主角个人关联资源（铜钱 / 粮食 / 麻布 / 宗族声望）。
- P0 历史 Bug（已修复，勿回退）：① 入局背景板层级过高遮挡界面；② 单位拖拽后悬浮轮盘定位偏移；③ 人物志弹窗缺少关闭逻辑。

## 5.4 奇遇 & 建筑配套约束
- 空地开发、建筑升级数值按「里 < 亭 < 乡 < 县」层级比例写入 `config.ts`（禁止页面写死阈值）。
- 树状非线性奇遇分支收益**同步联动四维管理模块**，微观经营、宏观争霸数值互通，避免玩法割裂。
- 人际分支点击跳转点位、人物卡牌视角故事内容从数据库（`scenario`）读取，剧情文本不硬编码。

---

## 2.9 开发编辑模式（ESC 开关的调试工具）
- 用途：测试期现场调整——**拖拽/输入单位位置**（更换大地图节点布局）、**更换人物卡片**（emoji/五维/称号/绑定村/解锁）、**改写城市资源**（每村人口·民心·乡勇·赋税·三类产出·地形·归属·层级 + 主角全局铜钱/粮食/麻布/宗族声望）。
- 入口：按 **ESC** 开关；优先关弹窗，否则切换开发模式（应用级 ESC 调度在 `main.ts`，`modal.ts` 不再单独监听 ESC）。
- 实现：`src/ui/devPanel.ts`（复用白名单 `tabs.ts` 的 `tabBarHTML`），直接改 `store.state` 并 `store.commit()` 自动存档；地图节点拖拽由 `mapRenderer.setDevDrag` 控制，`onDevMove` 实时回写坐标输入框。
- 性质：调试工具，**不触碰游戏规则引擎**，关闭后地图还原为只读平移；不属于生产 UI，不计入红线与白名单约束范围。

## 2.10 动态事件 / 危机系统（让游戏「有心跳」，解决「过于无趣」）
> 设计原则：在现有村落 MVP 上加内容、**不伤架构、不硬编码**；事件成效复用奇遇成效（`AdventureEffect`，含 `militia`），UI 复用全局弹窗（`modal.ts`，`dismissable:false` 强制抉择）。

- **数据模型**（`src/data/types.ts`）：`GameEvent` / `EventChoice` / `EventTrigger` / `EventEffect`（=`AdventureEffect`）；`Scenario.events` 事件池。
- **触发机制**：`endTurn` 末尾调 `engine.rollEvents(state, scenario.events)` 按 `EventTrigger`（`everyTurn` 概率 / `date` / `flag` / `repBelow` / `minxinBelow`）抽取一个，存入 `GameState.pendingEventId`；`once` 事件只触发一次。
- **抉择与后果**：`engine.chooseEvent` 校验前置/资源 → 应用成效（资源/声望/民心/人口/乡勇/flag/解锁英雄/官职）→ 清 pending → 失败判定。选项有代价（耗资源/声望），非纯点奖励。
- **失败条件（宽容）**：`engine.checkDefeat` —— 主角本村（`HOME_VILLAGE_ID` 大树楼桑里）民心 ≤ 0，或 flag `home_fallen` → `status='lost'` 败北遮罩（不可关闭，提供「重整旗鼓」重开）。
- **UI**：`hud.ts` 的 `openEventModal`（强制抉择卡）/ `openDefeatModal`（败北）/ `showEventResult`（结果播报），全部复用 `modal.ts`；回合结束按钮后自动弹出。
- **内容（刘备线，黄巾背景）**：`ev_petty` 里中细故（开局即有，每回合 20%）、`ev_turban_raid` 黄巾流寇袭扰（黄巾起后）、`ev_drought` 蝗旱之灾、`ev_neighbor_help` 邻村告急、`ev_merchant` 中山富商再来（一次性）。
- **红线自检**：成效全在 `scenario` 数据；仅刘备关联点位；复用公共弹窗/成效，无重复基建。

## 2.11 地图渲染（俯视六边形格子，视图层 ONLY）
> 用户需求：视觉改为「俯视六边形格子地图」，并点名「切勿重复造轮子」。结论：数据层仍是村落节点图（点+边），**仅视图层改渲染**，SIM/引擎零改动。L1 大世界即本六边形地图；L2/L3 详图见 §2.12。

- **几何工具**：`src/view/hex.ts` —— pointy-top 轴向坐标标准算法（`hexToPixel`/`pixelToHex`/`hexCorners`/`hexKey`），属通用几何，非重复造轮子。
- **渲染**：`src/view/mapRenderer.ts` 每帧把村落 `position` 吸附到最近六边形中心（碰撞则顺延 r），画「背景地形格 + 村落所属六边形（归属着色）+ 道路连线」；`hitTest` 改为六边形精确拾取（点所属格 → occupied 表）。
- **配置**：六边形半径 `MAP_HEX_SIZE` 写在 `config.ts`（禁止页面写死）。
- **复用**：hover/select/devDrag/routes/mapMode（owner·terrain·elevation）全部沿用；`position` 仍是视图层坐标（dev 面板拖拽改它），SIM 不读 `position`。
- **变更边界**：新增地图视觉效果=只动 `hex.ts`+`mapRenderer.ts`+`config.ts` 的 `MAP_HEX_SIZE`；不得为六边形化而改 `types.ts`/`engine.ts`/`store.ts`。

## 2.12 三阶地图（大世界 ▸ 村落详图 ▸ 房室内部，视图层状态机 ONLY）
> 用户需求：地图做 3 级——缩小是大世界（L1 现有村落节点图），放大是村落内部（L2 村屋/农田/祠堂…），再进是建筑房间（L3）。结论：**完全在视图层实现，DATA/SIM 零改动**，复用 `hex.ts` 几何与 `config.ts` 的地块/房间配置。

- **状态机（视图层）**：`src/view/mapRenderer.ts` 维护 `level(1/2/3)` + `currentVillageId` + `currentBuildingType`；导航 API `getLevel()/currentVillageName()/currentBuildingName()/canEnterVillage(id)/enterVillage(id)/enterBuilding(spotType)/exitToVillage()/exitToWorld()`，每次切换调用 `store.touch()` 触发 UI 刷新（面包屑同步）。
- **进入闸门 `canEnterVillage`**：本村 `HOME_VILLAGE_ID` 任意身份可进；外村需 `rankValue(title)>=2`（亭长+）。布衣仅能进自家村落观览。
- **L1 大世界**：复用 §2.11 的六边形村落节点图（不变）。
- **L2 村落详图**：按 `config.ts` 的 `VILLAGE_SPOTS`（家园/织席所/树林/农田/祠堂/水井/市集，7 地块，各带 `action`）用 `ringLayout(n)`（中心+至多 6 邻格簇布局）绘制；圆形拾取 `hitCluster`；地块上画 🔒 锁定图标（权限不足）；点击 `enter` 类 → `enterBuilding` 下沉到 L3，其余 → `onSpotAction?.(vid, action)` 交给 UI 处理（含权限复核 `spotAllowed`）。
- **L3 房室内部**：按 `config.ts` 的 `BUILDING_ROOMS`（home/shrine/farm/well/market 各房间，带 `action`）绘制房间；点击执行对应动作（个人营生 / 营建 / 升格等），同样经 `spotAllowed` 复核。
- **内容配置**（禁止渲染层写死）：`VILLAGE_SPOTS` / `BUILDING_ROOMS` / `SpotAction` 类型 / `MAP_LEVEL_LABELS`（大世界/村落详图/房室内部）全部集中在 `config.ts`；`market` 房间 `动作=none`（通商改在村落「外交」维度与邻村进行，避免无 target 的非法通商）。
- **UI 联动**：① 顶栏面包屑（大世界▸村落▸房室）点击 `mapnav` 回退层级；② 悬浮轮盘按权限动态生成——可进入则加「进入村落」，本村布衣加个人营生，里长+ 加治理维度，不可经营外村加「打听消息」；③ 地块/房间权限不足点击 → `ui.notifyLocked` 弹 🔒 提示（属红线联动，不静默吞掉）。
- **变更边界**：新增层级/地块/房间 = 只动 `config.ts` 内容表 + `mapRenderer.ts` 渲染分发；**不得**为此新增/改动 `types.ts`/`engine.ts`/`store.ts` 的数据结构（store 仅新增 `touch()` 轻量刷新与 `weave/chopWood/goHome/visitShrine` 方法，未改既有字段与规则）。

## 2.13 月度行动事件卡（朔日抽 3 选 1 + 行动分支 + 大世界资源点）
> 用户需求（已纠偏）：**不是抽武将氪金卡，是月度行动事件卡**。用织席贩履赚的铜钱兑换抽卡次数；一月三旬，朔日抽 3 张「未知内容、仅露大类」的候选卡，择 1 作为当月行动主题；选中卡=本月事件，其行动分支在当月自由施行，完成拿五维/人脉/资源，部分分支在大世界生成可开采资源点；营生所得反哺下月抽卡。卡=事件机会，非武将。6 大类绑定四玩法线（奇遇=政治 / 良缘=人事 / 求学=内政 / 练武=人事 / 结交=外交 / 营生=内政）。高级质感、大类大字、鼠标下钻、编辑态上传等原要求保留。

- **数据层（`config.ts`，全部集中，禁止页面写死）**：
  - `EVENT_LINE: Record<CardCategory, EventLine>` 大类→四线映射；`EventLine = 政治|人事|内政|外交`。
  - `EVENT_BRANCHES: Record<CardCategory, BranchTemplate[]>`：每类 **2 条固定分支模板**（初期只做 2–3 条、全围绕刘备涿县布衣线，不铺全域社交网）；`BranchTemplate = { id, label, desc?, requireOfficial?, resultText, grantsAttr?, grantsRes?, flags?, spawnResource?, unlockNpc? }`——**只声明产出种类，不含固定数值**；具体五维/资源数值由 `rollBranchReward(模板, 玩法线, 稀有度)` 在候选生成时一次性 random 并随候选固化进 `GachaCandidate.branches[].rolledReward`。
  - **六色稀有度**（非 4 档）：白/绿/蓝/紫/红/金，权重 40/30/18/9/2.5/0.5（`CARD_RARITIES` 含 `color/glow`；`rarityRank`/`RARITY_ORDER`/`PITY_RARITY='purple'`）；`rollEventCandidates` 双保底：**≥1 张营生卡**（`yingShengFloor`）+ **≥1 张达紫**（否则随机一候选 `forcePurple` 重 roll）。
  - **全随机数值**：`RARITY_REWARD[稀有度] = { attrBudget, resRange, maxStats }` 定档位；`LINE_STAT_WEIGHTS[线]` 定玩法线→五维权重（政治偏政、人事偏魅、内政偏智、外交偏魅+智）；`rollBranchReward` 按权重挑维度、按预算分配点数、余点进主维度，产出 `{ attr?, res?, flags?, spawnResource?, unlockNpc? }`（`BranchReward`）。`CARD_POOL` 改 `CardFlavor[]`（仅 `id/category/name/emoji/desc`，**无 rarity/effect**），仍 24 张；`MONTHLY_DRAW = { cost:8, candidates:3, pick:1, yingShengFloor:1, pityRarity }`。
- **SIM（`engine.ts` + `store.ts`）**：`GameState` 增 `resourcePoints / gachaCandidates / activeEvent / completedBranches / eventDrawDue`。
  - `engine.applyBranchReward(state, reward)` 落地五维/资源/人脉 flag/揭示 NPC（`unlockNpc` 置 `npc.status='developed'`）/大世界资源点；`spawnResourcePoint(state, kind)` 在玩家本村附近散布生成 `ResourcePoint`（用 `RESOURCE_KIND_META` 配数值）。
  - `store.maybeStartMonthEvent()` 朔日生成 3 候选（每月一次）；`pickEventCard(id)` 扣费、落即时成效、置 `activeEvent`；`executeBranch(id)` **布衣受 `requireOfficial` 闸门**（官府之事不可为），落 `b.rolledReward` 预 rolled 成效（候选生成时固化、施行时直接 `applyBranchReward(s, b.rolledReward)` 落地），全分支完成则清 `activeEvent`；`extractResource(id)` 包装 `mineResource`（即时开采）。`endTurn` 在 `calendar.xun===1 && turn>1` 触发朔日抽卡；`processTurn` 对玩家已开发资源点每回合被动产出。
  - 持久化（`persistence.ts`）白名单补齐 `attr/assets/resourcePoints/gachaCandidates/activeEvent/completedBranches/eventDrawDue`。
- **UI（视图/UI 层，复用 Modal / 人物志 / 人际 / 五维，不重造轮子）**：
  - `gacha.ts`：朔日弹窗 → 3 张候选（背面显**大类大字 + 稀有度色/辉光**，紫+加 `.gc-shine` 流光层，内容隐藏）→ 点击择 1 揭晓为「本月事件面板」：列出行动分支按钮（完成态 ✓、布衣锁定 🔒）、`rewardChips(b)` 把预 rolled 的 `b.rolledReward` 渲染为 chips（统/武/智/政/魅 + 资源 / 资源点 / 人物），施行后刷新并同步五维/人脉/资源点。
  - `dashboard.ts` 增「🟫资源」tab：列资源点 + 储量条 +「⛏️ 开采」；`mapRenderer.ts` L1 渲染资源点 emoji+储量条、`hitResourcePoint` 命中、`onResourceClick` 回调；`hud.ts` 月头自动开抽卡 + `mine` 处理；`main.ts` 接 `onResourceClick` 弹信息+开采。
  - `.gc-cat` 字号 1.7rem/900 凸显大类；卡面背景 = 自定义上传或 `/assets/cards/<cat>.svg`；编辑态资源上传（背景/人物/卡面）同 §2.13 资源文件夹约定。
  - **编辑覆盖层（v2，独立层）**：`store.setDevOverride(path,value)` / `getDevOverrides()` / `exportDev()` / `clearDevOverrides()` + `path.ts` 的 `getByPath/setByPath/deepMerge`；覆盖存**独立 localStorage 键 `sank_dev_overrides`**，与玩家存档（`sank_save_*`）完全分离；`hydrate` 与 `constructor` 末 `deepMerge` replay。`src/ui/editOverlay.ts` 在开发模式（ESC 开）下拦截点击带 `[data-edit]`（文字/数值）或 `[data-edit-img]`（立绘/卡面/背景）的元素写回覆盖层（数值自动解析、其余按文本）；`devPanel.ts` 新增「📤 导出覆盖 / 🧹 清空覆盖」按钮（导出弹窗可复制 / 下载 JSON）。界面全部可编辑元素在 `body.dev-edit-on` 下以品红虚线高亮。
- **约束与防坑**：事件分类/分支/数值**全在 `config.ts`**；六色稀有度档位（`CARD_RARITIES`）与玩法线加权随机数值（`rollBranchReward`/`RARITY_REWARD`/`LINE_STAT_WEIGHTS`）也全在 config，页面禁止写死任何权重/数值；每月双保底（营生卡 + 达紫）；初期每类仅 2–3 条固定分支、NPC 仅限既定角色（张飞/老兵/匠人/同乡/富商等），不铺随机路人；布衣抽到结交/练武只能解锁民间层面人脉/自保，`requireOfficial` 闸门（晋升后放开）；不想抽卡也可纯手动摆摊种田慢玩（抽卡只是提速）。资质单一来源仍为 `state.attr`（五维），四线仅作事件主题分类。编辑覆盖层（devOverrides）仅用于开发期临时改参，优先级高于玩家存档但**不写入玩法规则**，导出后可提交复用。

# 三、固定 AI 协作模板（后续新增需求直接套用）

## 3.1 固定提问模板（用户填空）
```
【新增需求】：______
```
AI 接到后**必须先逐条校验**再出方案：
1. 本需求能否复用现有公共组件 / 数据表？是否存在重复造轮子风险？
2. 哪些内容会产生硬编码隐患，对应抽离全局配置的方案？
3. 和「织席贩履奇遇 → 四维管理 → 郡县层级 → 黄巾主线」整体玩法是否冲突割裂？
4. 数据库是否新增字段 / 新表，SQLite→PostgreSQL 迁移兼容性说明？
5. 不合理 / 可合并 / 延后开发的异议提示；最后输出可落地开发细则。

## 3.2 AI 强制异议触发规则（命中任意项必须主动叫停、提风险，不直接写方案）
- 新需求可复用现有组件却要求单独开发；
- 需要写死数值、文案、点位，存在硬编码隐患；
- 功能脱离主线玩法，造成微观经营与宏观争霸割裂；
- 表结构设计不兼容后期 PostgreSQL 迁移；
- 同类弹窗 / 标签 / 轮盘重复设计多套逻辑；
- Demo 阶段接入过重非核心功能，拉长主线开发周期。

## 3.3 AI 固定输出四段结构（禁止散漫发散）
1. 风险异议 & 冲突提示
2. 可复用现有组件 / 数据表清单
3. 防硬编码改造要点
4. 下发开发执行细则

---

# 四、🔴 强制异议与确认规则（开发中期尤其重要）

> 本条为本文件最高优先级执行规则。AI 在**任何开发中期**接到需求时，第一步不是动手，而是**检索现有代码/组件/数据表是否已覆盖该需求**。

**触发动作**：若发现「新需求与已有功能/组件/数据表重复或高度重叠」，AI 必须**立即打断开发**，先向用户输出：
> ⚠️ **重复确认**：此需求与现有「【某某功能 / 组件 / 文件】」重复/高度重叠（说明重叠点）。是否需要仍要开发？若只需复用/微调，建议直接调用现有「【位置】」而非新建。

**等待用户明确答复（开发 / 复用现有 / 合并）后**，方可继续。未经确认不得默默新建一套等价实现（这正是 §2.3 红线 2「禁止重复造轮子」的兜底执行机制）。

适用范围：UI 组件、模拟核心函数、数据表/字段、配置常量、交互系统——凡是「看起来像新需求，其实已有近似实现」的情形，一律先确认。开发越早（代码量越大）越要执行本条，避免后期数据填充时灾难性返工。
