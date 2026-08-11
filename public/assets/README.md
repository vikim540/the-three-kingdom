# 资源目录约定（public/assets）

本目录存放可按分类管理的视觉资源。Vite 在 `npm run dev` / `npm run build` 时自动将
`public/` 原样映射到站点根路径，故 `/assets/...` 即可直接引用。

## 文件夹结构

```
public/assets/
├── backgrounds/        # 大世界地图底图
│   └── parchment.svg   # 默认羊皮纸底图（编辑模式可上传替换）
├── cards/              # 奇遇卡牌「卡面背景」，按卡种类分类
│   ├── qi_yu.svg       # 奇遇
│   ├── liang_yuan.svg  # 良缘
│   ├── qiu_xue.svg     # 求学
│   ├── lian_wu.svg     # 练武
│   ├── jie_jiao.svg    # 结交
│   └── ying_sheng.svg  # 营生
└── portraits/          # 人物立绘
    └── liubei.svg      # 主角占位立绘
```

## 资源如何被使用

- **大世界背景**：`state.assets.mapBackground`（编辑态上传的 dataURL，或留空时用默认
  `/assets/backgrounds/parchment.svg`）。由 `MapView.paintBackdrop()` 绘制为画布底图。
- **分类卡面**：卡牌揭示时优先用 `state.assets.cardBackgrounds[种类]`（编辑态上传），
  否则取 `/assets/cards/<种类>.svg`。
- **人物立绘**：`hero.portrait`（英雄卡）与 `state.assets.protagonistPortrait`（主角），
  由英雄卡 / 资质看板渲染；未上传时显示 emoji 占位。

## 上传方式（免写代码）

开启「开发编辑模式」（ESC），切到「🖼️ 资源」标签页，即可上传：
背景图 / 主角人物图 / 英雄人物图 / 分类卡面图。上传内容以 dataURL 形式存入存档并自动落地。

> 也可把图片直接放到对应文件夹（如 `cards/qi_yu.svg` 替换为自己的图），
> 只要文件名与种类 key 一致即可被默认引用。
