import * as Phaser from "phaser";
import { STAGE_1_BANDIT } from "../config/stages";
import { useBattleStore } from "@/stores/useBattleStore";
import { BattleUnit } from "@/types/game";
import { getTileQuadrilateral, screenToGrid, Quadrilateral } from "../utils/perspective";

interface UnitCardContainer extends Phaser.GameObjects.Container {
  unitInstanceId?: string;
  gridX?: number;
  gridY?: number;
}

export class BattleScene extends Phaser.Scene {
  private unitContainers: Map<string, UnitCardContainer> = new Map();
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private highlightGraphics!: Phaser.GameObjects.Graphics;
  private hoveredTile: { x: number; y: number } | null = null;

  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    // 1. 全螢幕山谷背景圖
    this.addBackground();

    // 2. 梯形透視網格圖層
    this.gridGraphics = this.add.graphics();
    this.highlightGraphics = this.add.graphics();
    this.drawPerspectiveGrid();

    // 3. 拖拽監聽 (梯形透視區域檢測)
    this.enableDragAndDrop();

    // 4. 指標移動高亮格子
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const gridPos = screenToGrid(pointer.x, pointer.y, this.scale.width, this.scale.height);
      if (gridPos && (this.hoveredTile?.x !== gridPos.x || this.hoveredTile?.y !== gridPos.y)) {
        this.hoveredTile = gridPos;
        this.drawHighlights();
      }
    });

    // 5. 訂閱 Zustand Store 單位數據
    this.syncUnitsFromStore();
    useBattleStore.subscribe((state) => {
      this.updateUnitsVisual(state.units);
    });

    // 6. 螢幕 resize 時重新渲染網格與單位
    this.scale.on("resize", () => {
      this.scene.restart();
    });
  }

  private addBackground() {
    const w = this.scale.width;
    const h = this.scale.height;
    const texKey = this.textures.exists("forest_path_bg") ? "forest_path_bg" : "battle_bg";
    const bg = this.add.image(w / 2, h / 2, texKey);
    bg.setDisplaySize(w, h);
    bg.setAlpha(0.92);

    // 頂部山林深處暗色霧氣疊加，增強遠近景深感
    const fogG = this.add.graphics();
    fogG.fillGradientStyle(0x05101e, 0x05101e, 0x000000, 0x000000, 0.7, 0.7, 0, 0);
    fogG.fillRect(0, 0, w, h * 0.45);
  }

  /**
   * 繪製 4x10 梯形透視網格、草叢與特殊地形
   */
  private drawPerspectiveGrid() {
    this.gridGraphics.clear();
    const sw = this.scale.width;
    const sh = this.scale.height;

    // 1. 繪製所有格子的梯形邊框與填充
    STAGE_1_BANDIT.tiles.forEach((tile) => {
      const quad = getTileQuadrilateral(tile.x, tile.y, sw, sh);
      const isBush = tile.terrain === "BUSH";
      const isEscape = tile.terrain === "ESCAPE";
      const isObstacle = tile.terrain === "OBSTACLE";

      // 格子底色
      if (isBush) {
        // 幽綠伏擊草叢
        this.gridGraphics.fillStyle(0x064e3b, 0.55);
        this.gridGraphics.lineStyle(1.5, 0x10b981, 0.8);
      } else if (isEscape) {
        // 青藍逃生法陣
        this.gridGraphics.fillStyle(0x0c4a6e, 0.6);
        this.gridGraphics.lineStyle(2, 0x38bdf8, 0.9);
      } else if (isObstacle) {
        // 黑石障礙
        this.gridGraphics.fillStyle(0x18181b, 0.7);
        this.gridGraphics.lineStyle(1.5, 0xef4444, 0.5);
      } else {
        // 普通山道小路（金黃透視網格）
        this.gridGraphics.fillStyle(0x1c1917, 0.35);
        this.gridGraphics.lineStyle(1, 0xd97706, 0.4);
      }

      // 繪製梯形四點
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(quad.topLeft.x, quad.topLeft.y);
      this.gridGraphics.lineTo(quad.topRight.x, quad.topRight.y);
      this.gridGraphics.lineTo(quad.bottomRight.x, quad.bottomRight.y);
      this.gridGraphics.lineTo(quad.bottomLeft.x, quad.bottomLeft.y);
      this.gridGraphics.closePath();
      this.gridGraphics.fillPath();
      this.gridGraphics.strokePath();

      // 裝飾細節：草叢標籤圖案
      if (isBush) {
        this.addBushVisual(quad);
      } else if (isEscape) {
        this.addEscapeVisual(quad);
      }
    });
  }

  private addBushVisual(quad: Quadrilateral) {
    const fontSize = Math.max(10, Math.floor(14 * quad.scale));
    this.add.text(quad.center.x, quad.center.y + quad.height * 0.15, "🌿 伏擊草叢", {
      fontSize: `${fontSize}px`,
      color: "#6ee7b7",
      stroke: "#064e3b",
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0.85);
  }

  private addEscapeVisual(quad: Quadrilateral) {
    const fontSize = Math.max(10, Math.floor(13 * quad.scale));
    this.add.text(quad.center.x, quad.center.y, "☸ 逃生法陣", {
      fontSize: `${fontSize}px`,
      color: "#7dd3fc",
      stroke: "#0c2540",
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0.9);
  }

  /**
   * 繪製高亮光框（布陣階段/懸停格子）
   */
  private drawHighlights() {
    if (!this.highlightGraphics) return;
    this.highlightGraphics.clear();
    const sw = this.scale.width;
    const sh = this.scale.height;
    const store = useBattleStore.getState();

    // 1. 布陣階段：高亮玩家可布陣近處區域 (金黃閃耀光澤)
    if (store.phase === "DEPLOYMENT") {
      STAGE_1_BANDIT.playerSpawnTiles.forEach((sp) => {
        const quad = getTileQuadrilateral(sp.x, sp.y, sw, sh);
        this.highlightGraphics.fillStyle(0xf59e0b, 0.15);
        this.highlightGraphics.lineStyle(2.5, 0xfbbf24, 0.9);
        this.drawQuadPolygon(quad);
      });
    }

    // 2. 指標懸停格子亮框
    if (this.hoveredTile) {
      const quad = getTileQuadrilateral(this.hoveredTile.x, this.hoveredTile.y, sw, sh);
      this.highlightGraphics.fillStyle(0xffffff, 0.2);
      this.highlightGraphics.lineStyle(2, 0xffedd5, 1);
      this.drawQuadPolygon(quad);
    }
  }

  private drawQuadPolygon(quad: Quadrilateral) {
    this.highlightGraphics.beginPath();
    this.highlightGraphics.moveTo(quad.topLeft.x, quad.topLeft.y);
    this.highlightGraphics.lineTo(quad.topRight.x, quad.topRight.y);
    this.highlightGraphics.lineTo(quad.bottomRight.x, quad.bottomRight.y);
    this.highlightGraphics.lineTo(quad.bottomLeft.x, quad.bottomLeft.y);
    this.highlightGraphics.closePath();
    this.highlightGraphics.fillPath();
    this.highlightGraphics.strokePath();
  }

  /**
   * 拖拽手勢處理
   */
  private enableDragAndDrop() {
    this.input.on("drag", (_ptr: Phaser.Input.Pointer, go: UnitCardContainer, dx: number, dy: number) => {
      if (useBattleStore.getState().phase === "DEPLOYMENT") {
        go.x = dx;
        go.y = dy;
        // 拖拽時拉高 zIndex 置頂
        go.depth = 1000;
      }
    });

    this.input.on("dragend", (_ptr: Phaser.Input.Pointer, go: UnitCardContainer) => {
      const store = useBattleStore.getState();
      if (store.phase !== "DEPLOYMENT") return;

      const sw = this.scale.width;
      const sh = this.scale.height;
      const gridPos = screenToGrid(go.x, go.y, sw, sh);

      const isSpawnTile = gridPos && STAGE_1_BANDIT.playerSpawnTiles.some(
        (sp) => sp.x === gridPos.x && sp.y === gridPos.y
      );

      if (go.unitInstanceId && isSpawnTile && gridPos) {
        store.updateUnitPosition(go.unitInstanceId, gridPos.x, gridPos.y);
        const tileInfo = STAGE_1_BANDIT.tiles.find((t) => t.x === gridPos.x && t.y === gridPos.y);
        const isBush = tileInfo?.terrain === "BUSH";
        store.addCombatLog(
          `📍 佈陣於 (${gridPos.x}, ${gridPos.y})${isBush ? " ✦ 進入草叢伏擊狀態！" : ""}`,
          "info"
        );
      } else {
        // 放回原本座標
        const unit = store.units.find((u) => u.instanceId === go.unitInstanceId);
        if (unit) {
          const quad = getTileQuadrilateral(unit.x, unit.y, sw, sh);
          go.x = quad.center.x;
          go.y = quad.center.y;
        }
      }
      go.depth = go.gridY ?? 0;
    });
  }

  private syncUnitsFromStore() {
    this.updateUnitsVisual(useBattleStore.getState().units);
  }

  /**
   * 建立與更新「卡牌式」名將單位 Container
   */
  private updateUnitsVisual(units: BattleUnit[]) {
    this.drawHighlights();
    const sw = this.scale.width;
    const sh = this.scale.height;

    units.forEach((unit) => {
      const quad = getTileQuadrilateral(unit.x, unit.y, sw, sh);
      let container = this.unitContainers.get(unit.instanceId);
      const isPlayer = unit.faction === "PLAYER";

      if (!container) {
        container = this.add.container(quad.center.x, quad.center.y) as UnitCardContainer;
        container.unitInstanceId = unit.instanceId;

        // 構建精美卡牌 UI
        this.buildHeroCard(container, unit, quad.scale);
        this.unitContainers.set(unit.instanceId, container);
      }

      container.gridX = unit.x;
      container.gridY = unit.y;
      // depth 由 gridY 決定，實現近處卡片遮擋遠處卡片的天然景深層次
      container.depth = unit.y * 10 + (isPlayer ? 5 : 0);

      // 梯形透視下的縮放與平滑移動
      const targetScale = quad.scale;
      this.tweens.add({
        targets: container,
        x: quad.center.x,
        y: quad.center.y,
        scaleX: targetScale,
        scaleY: targetScale,
        duration: 260,
        ease: "Power2",
      });

      // 更新卡片內血條
      const hpFill = container.getByName("cardHpFill") as Phaser.GameObjects.Rectangle;
      if (hpFill) {
        const fullW = (container.getData("cardWidth") as number) * 0.82;
        const ratio = Math.max(0, unit.currentHp / unit.maxHp);
        hpFill.setSize(fullW * ratio, 5);
      }

      // 死亡淡出
      if (unit.isDead) {
        this.tweens.add({
          targets: container,
          alpha: 0,
          duration: 400,
          onComplete: () => container?.setVisible(false),
        });
      } else {
        container.setVisible(true).setAlpha(1);
      }
    });
  }

  /**
   * 創建三國修仙名將「實體卡牌」UI Container
   */
  private buildHeroCard(container: UnitCardContainer, unit: BattleUnit, baseScale: number) {
    container.removeAll(true);

    const isPlayer = unit.faction === "PLAYER";
    const quality = unit.heroConfig.quality || "靈";

    // 1. 卡牌基準尺寸 (寬 94, 高 126)
    const cardW = isPlayer ? 96 : 82;
    const cardH = isPlayer ? 128 : 110;
    container.setData("cardWidth", cardW);
    container.setData("cardHeight", cardH);

    // 品質色彩定義 (凡灰、靈綠、王藍、帝紫、仙金)
    const qualityColors: Record<string, { border: number; bg: number; text: string }> = {
      仙: { border: 0xf59e0b, bg: 0x451a03, text: "#fbbf24" },
      帝: { border: 0xa855f7, bg: 0x3b0764, text: "#c084fc" },
      王: { border: 0x3b82f6, bg: 0x1e3a8a, text: "#60a5fa" },
      靈: { border: 0x10b981, bg: 0x064e3b, text: "#34d399" },
      凡: { border: 0x64748b, bg: 0x1e293b, text: "#94a3b8" },
    };
    const qc = qualityColors[quality] || qualityColors["靈"];
    const borderColor = isPlayer ? qc.border : 0xb91c1c;

    // 2. 卡牌金色外發光底框
    const cardGlow = this.add.graphics();
    cardGlow.fillStyle(borderColor, 0.25);
    cardGlow.fillRoundedRect(-cardW / 2 - 4, -cardH / 2 - 4, cardW + 8, cardH + 8, 8);

    // 3. 卡牌主底板
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x09090b, 0.95);
    cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
    cardBg.lineStyle(isPlayer ? 2.5 : 2, borderColor, 1);
    cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);

    // 4. 頭像 Sprite
    let texKey = "hero_protagonist";
    const id = unit.heroConfig.id;
    if (id === "hero_huang_zhong") texKey = "hero_huang_zhong";
    else if (id === "hero_xiahou_dun") texKey = "hero_xiahou_dun";
    else if (id === "hero_zhao_yun") texKey = "hero_zhao_yun";
    else if (id === "hero_guo_jia") texKey = "hero_guo_jia";
    else if (id === "enemy_bandit_chief") texKey = "enemy_bandit_chief";
    else if (id === "enemy_bandit_thug") texKey = "enemy_bandit_thug";

    const portrait = this.add.image(0, -6, texKey);
    const pW = cardW - 8;
    const pH = cardH - 36;
    portrait.setDisplaySize(pW, pH);

    // 5. 頂部陣營標籤條
    const factionBar = this.add.graphics();
    const factionColor = unit.heroConfig.faction === "蜀" ? 0x15803d :
      unit.heroConfig.faction === "魏" ? 0x1d4ed8 :
      unit.heroConfig.faction === "吳" ? 0xb91c1c : 0x78350f;
    factionBar.fillStyle(factionColor, 0.9);
    factionBar.fillRoundedRect(-cardW / 2 + 2, -cardH / 2 + 2, cardW - 4, 16, { tl: 5, tr: 5, bl: 0, br: 0 });

    const factionText = this.add.text(0, -cardH / 2 + 10, `${unit.heroConfig.faction} • ${quality}階`, {
      fontSize: "10px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    // 6. 底部名字牌
    const nameBg = this.add.graphics();
    nameBg.fillStyle(0x0f172a, 0.95);
    nameBg.fillRoundedRect(-cardW / 2 + 2, cardH / 2 - 24, cardW - 4, 22, { tl: 0, tr: 0, bl: 5, br: 5 });
    nameBg.lineStyle(1, borderColor, 0.7);
    nameBg.strokeRoundedRect(-cardW / 2 + 2, cardH / 2 - 24, cardW - 4, 22, { tl: 0, tr: 0, bl: 5, br: 5 });

    const nameText = this.add.text(0, cardH / 2 - 13, unit.heroConfig.name, {
      fontSize: "12px",
      color: isPlayer ? "#fef08a" : "#fca5a5",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);

    // 7. 頂部血條
    const hpBarW = cardW * 0.82;
    const hpBg = this.add.rectangle(0, -cardH / 2 - 7, hpBarW, 6, 0x000000, 0.85);
    const hpFill = this.add.rectangle(
      -hpBarW / 2, -cardH / 2 - 7,
      hpBarW * (unit.currentHp / unit.maxHp), 5,
      isPlayer ? 0x22c55e : 0xef4444, 1
    ).setOrigin(0, 0.5);
    hpFill.setName("cardHpFill");

    // 組合 Container 內容物
    container.add([cardGlow, cardBg, portrait, factionBar, factionText, nameBg, nameText, hpBg, hpFill]);

    // 設定梯形互動區域
    container.setInteractive(
      new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
      Phaser.Geom.Rectangle.Contains
    );

    if (isPlayer) {
      this.input.setDraggable(container);
    }

    container.on("pointerdown", () => {
      if (unit.faction === "PLAYER") {
        useBattleStore.getState().setSelectedUnitId(unit.instanceId);
      }
    });

    // 懸停動態效果 (卡牌放大 + 光暈增強)
    container.on("pointerover", () => {
      this.tweens.add({
        targets: container,
        scaleX: baseScale * 1.14,
        scaleY: baseScale * 1.14,
        duration: 120,
        ease: "Power1",
      });
    });

    container.on("pointerout", () => {
      this.tweens.add({
        targets: container,
        scaleX: baseScale,
        scaleY: baseScale,
        duration: 120,
        ease: "Power1",
      });
    });
  }
}
