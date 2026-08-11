# 三国 4X 策略游戏 · the-three-kingdom

一款类《三国志14》但**独立玩法**的 4X 策略游戏原型。核心循环：探索 / 扩张 / 开发 / 征服。

> 成长阶梯（从小见大，底层数据模型全程不变）：
> 村落 → 小镇 → 州府 → 大地图战争

## 技术栈

- **Vite 6 + TypeScript 5（strict）+ TailwindCSS v4**（`@tailwindcss/vite`，零 postcss 配置）
- 视图层当前为 **Canvas2D**；架构上已解耦，未来换 **Phaser 4** 只动视图层
- 模拟核心（`src/sim`）纯 TS、零渲染依赖、可单测
- 初版存档走 `localStorage`（预留 Cloudflare D1 / SQLite 迁移能力）

## 架构（四层解耦）

```
src/
├── data/      # 类型 + 剧本（config.ts 集中所有数值/文案/权限常量）
├── sim/       # 纯 TS 模拟核心：回合 / 战斗 / 占领 / AI / 抽卡状态机
├── view/      # Canvas2D 渲染（当前视图实现）
└── ui/        # DOM/Tailwind 面板：HUD / 抽卡 / 状态台 / 编辑覆盖层 / 弹窗等
```

## 核心玩法

- **月度行动事件卡（朔日抽 3 选 1）**：六色稀有度（白/绿/蓝/紫/红/金）+ 双保底（≥1 营生卡、≥1 达紫），属性数值全随机并固化进候选。
- **布衣起步**：初期无官职，管理面板与官府功能隐藏；靠抽卡过渡生活，晋升后逐步解锁。
- **开发编辑模式（ESC）**：点击界面任意元素直接改文字/数值/立绘，写入独立 `devOverrides` 覆盖层（与玩家存档分离，可一键导出）。

## 开发红线

1. 禁止硬编码常量 —— 全部集中在 `src/data/config.ts`。
2. 禁止重复造轮子 —— 公共组件见 `agents.md` §2.6 白名单。
3. 模拟核心从第一天起不依赖渲染/UI 框架。
4. 初期仅开发刘备关联点位 / NPC。

详见 [`agents.md`](./agents.md)。

## 本地运行

```bash
npm install
npm run dev      # 开发预览（默认 http://localhost:5173）
npm run build    # 类型检查 + 生产构建
```
