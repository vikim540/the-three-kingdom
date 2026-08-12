import * as Phaser from "phaser";
import { MAP_COLS, MAP_ROWS } from "../config/constants";
import { STAGE_1_BANDIT } from "../config/stages";
import { useBattleStore } from "@/stores/useBattleStore";
import { BattleUnit } from "@/types/game";

interface UnitContainer extends Phaser.GameObjects.Container {
  unitInstanceId?: string;
}

export class BattleScene extends Phaser.Scene {
  private unitContainers: Map<string, UnitContainer> = new Map();
  private highlightGraphics!: Phaser.GameObjects.Graphics;
  private tileSize = 64;
  private mapOffsetX = 0;
  private mapOffsetY = 0;

  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    // 從 registry 讀取 BootScene 計算好的 tileSize
    this.tileSize = (this.registry.get("tileSize") as number) || 64;

    const gridW = MAP_COLS * this.tileSize;

    // 地圖水平居中，頂部留一點空白給 HUD
    this.mapOffsetX = Math.floor((this.scale.width - gridW) / 2);
    this.mapOffsetY = 50;

    // 1. 全螢幕背景圖填充整個畫布
    this.addBackground();

    // 2. 側面密林裝飾（兩側樹林填充空白區域）
    this.addForestSides();

    // 3. 初始化格子與高亮圖層
    this.highlightGraphics = this.add.graphics();
    this.createMapGrid();

    // 4. 啟用拖拽
    this.enableDragAndDrop();

    // 5. 訂閱 Zustand Store
    this.syncUnitsFromStore();
    useBattleStore.subscribe((state) => {
      this.updateUnitsVisual(state.units);
    });

    // 6. 螢幕 resize 時重建
    this.scale.on("resize", this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const hudHeight = 140;
    this.tileSize = Math.floor((gameSize.height - hudHeight) / MAP_ROWS);
    this.registry.set("tileSize", this.tileSize);
    const gridW = MAP_COLS * this.tileSize;
    this.mapOffsetX = Math.floor((gameSize.width - gridW) / 2);
    this.mapOffsetY = 50;
    this.scene.restart();
  }

  private addBackground() {
    const w = this.scale.width;
    const h = this.scale.height;
    const texKey = this.textures.exists("forest_path_bg") ? "forest_path_bg" : "battle_bg";
    const bg = this.add.image(w / 2, h / 2, texKey);
    bg.setDisplaySize(w, h);
    bg.setAlpha(0.95);
  }

  private addForestSides() {
    // 左右兩側密林半透明遮罩，讓格子區域更突出
    const gridW = MAP_COLS * this.tileSize;
    const gridH = MAP_ROWS * this.tileSize;
    const h = this.scale.height;
    const w = this.scale.width;

    const overlay = this.add.graphics();
    // 左側遮罩
    overlay.fillStyle(0x000000, 0.45);
    overlay.fillRect(0, 0, this.mapOffsetX, h);
    // 右側遮罩
    overlay.fillRect(this.mapOffsetX + gridW, 0, w - (this.mapOffsetX + gridW), h);
    // 上方遮罩
    overlay.fillStyle(0x000000, 0.3);
    overlay.fillRect(this.mapOffsetX, 0, gridW, this.mapOffsetY);
    // 下方留給 HUD，半透明漸層
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, this.mapOffsetY + gridH, w, h - (this.mapOffsetY + gridH));
  }

  private createMapGrid() {
    const ts = this.tileSize;

    STAGE_1_BANDIT.tiles.forEach((tile) => {
      let texKey = "tile_normal";
      if (tile.terrain === "BUSH") texKey = "tile_bush";
      else if (tile.terrain === "FOREST") texKey = "tile_forest";
      else if (tile.terrain === "OBSTACLE") texKey = "tile_obstacle";
      else if (tile.terrain === "ESCAPE") texKey = "tile_escape";

      const px = this.mapOffsetX + tile.x * ts + ts / 2;
      const py = this.mapOffsetY + tile.y * ts + ts / 2;

      const sprite = this.add.sprite(px, py, texKey).setInteractive();

      // 草叢小標籤
      if (tile.terrain === "BUSH") {
        this.add.text(px, py + ts * 0.38, "伏擊", {
          fontSize: `${Math.max(10, Math.floor(ts * 0.17))}px`,
          color: "#6ee7b7",
          stroke: "#064e3b",
          strokeThickness: 3,
        }).setOrigin(0.5);
      } else if (tile.terrain === "ESCAPE") {
        this.add.text(px, py + ts * 0.35, "逃生", {
          fontSize: `${Math.max(10, Math.floor(ts * 0.17))}px`,
          color: "#7dd3fc",
          stroke: "#0c2540",
          strokeThickness: 3,
        }).setOrigin(0.5);
      } else if (tile.terrain === "FOREST") {
        this.add.text(px, py + ts * 0.36, "密林", {
          fontSize: `${Math.max(9, Math.floor(ts * 0.15))}px`,
          color: "#6ee7b7",
          stroke: "#022c22",
          strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0.8);
      }

      // 點擊格子布陣
      sprite.on("pointerdown", () => {
        const store = useBattleStore.getState();
        if (store.phase === "DEPLOYMENT" && store.selectedUnitId) {
          const isSpawn = STAGE_1_BANDIT.playerSpawnTiles.some(
            (sp) => sp.x === tile.x && sp.y === tile.y
          );
          if (isSpawn && tile.terrain !== "OBSTACLE") {
            store.updateUnitPosition(store.selectedUnitId, tile.x, tile.y);
            store.addCombatLog(
              `📍 移至 (${tile.x},${tile.y})${tile.terrain === "BUSH" ? " ✦ 進入伏擊草叢！" : ""}`,
              "info"
            );
          }
        }
      });
    });

    this.drawHighlights();
  }

  private drawHighlights() {
    if (!this.highlightGraphics) return;
    this.highlightGraphics.clear();
    const ts = this.tileSize;
    const store = useBattleStore.getState();

    if (store.phase === "DEPLOYMENT") {
      // 玩家布陣區 — 金黃光框
      this.highlightGraphics.lineStyle(3, 0xfbbf24, 0.9);
      STAGE_1_BANDIT.playerSpawnTiles.forEach((sp) => {
        this.highlightGraphics.strokeRect(
          this.mapOffsetX + sp.x * ts + 2,
          this.mapOffsetY + sp.y * ts + 2,
          ts - 4, ts - 4
        );
      });

      // 逃生法陣區 — 青藍光框
      this.highlightGraphics.lineStyle(3, 0x38bdf8, 0.9);
      [[1, 9], [2, 9]].forEach(([x, y]) => {
        this.highlightGraphics.strokeRect(
          this.mapOffsetX + x * ts + 2,
          this.mapOffsetY + y * ts + 2,
          ts - 4, ts - 4
        );
      });
    }
  }

  private enableDragAndDrop() {
    this.input.on("drag", (_ptr: Phaser.Input.Pointer, go: UnitContainer, dx: number, dy: number) => {
      if (useBattleStore.getState().phase === "DEPLOYMENT") {
        go.x = dx;
        go.y = dy;
      }
    });

    this.input.on("dragend", (_ptr: Phaser.Input.Pointer, go: UnitContainer) => {
      const store = useBattleStore.getState();
      if (store.phase !== "DEPLOYMENT") return;
      const ts = this.tileSize;
      const gx = Math.floor((go.x - this.mapOffsetX) / ts);
      const gy = Math.floor((go.y - this.mapOffsetY) / ts);
      const isSpawn = STAGE_1_BANDIT.playerSpawnTiles.some((sp) => sp.x === gx && sp.y === gy);

      if (go.unitInstanceId && isSpawn && gx >= 0 && gx < MAP_COLS && gy >= 0 && gy < MAP_ROWS) {
        store.updateUnitPosition(go.unitInstanceId, gx, gy);
        store.addCombatLog(`🖐 拖拽至 (${gx},${gy})`, "info");
      } else {
        const unit = store.units.find((u) => u.instanceId === go.unitInstanceId);
        if (unit) {
          go.x = this.mapOffsetX + unit.x * ts + ts / 2;
          go.y = this.mapOffsetY + unit.y * ts + ts / 2;
        }
      }
    });
  }

  private syncUnitsFromStore() {
    this.updateUnitsVisual(useBattleStore.getState().units);
  }

  private updateUnitsVisual(units: BattleUnit[]) {
    this.drawHighlights();
    const ts = this.tileSize;

    units.forEach((unit) => {
      let container = this.unitContainers.get(unit.instanceId);
      const tx = this.mapOffsetX + unit.x * ts + ts / 2;
      const ty = this.mapOffsetY + unit.y * ts + ts / 2;
      const isPlayer = unit.faction === "PLAYER";
      const radius = Math.floor(ts * 0.37);

      if (!container) {
        container = this.add.container(tx, ty) as UnitContainer;
        container.unitInstanceId = unit.instanceId;

        // 外發光底圈
        const glowCircle = this.add.circle(0, 0, radius + 4, isPlayer ? 0x3b82f6 : 0xef4444, 0.3);
        // 主圓形
        const bgCircle = this.add.circle(0, 0, radius, 0x0f172a, 0.92);
        bgCircle.setStrokeStyle(2.5, isPlayer ? 0x60a5fa : 0xf87171, 1);

        // 頭像圖片
        let texKey = "hero_protagonist";
        const id = unit.heroConfig.id;
        if (id === "hero_huang_zhong") texKey = "hero_huang_zhong";
        else if (id === "hero_xiahou_dun") texKey = "hero_xiahou_dun";
        else if (id === "hero_zhao_yun") texKey = "hero_zhao_yun";
        else if (id === "hero_guo_jia") texKey = "hero_guo_jia";
        else if (id === "enemy_bandit_chief") texKey = "enemy_bandit_chief";
        else if (id === "enemy_bandit_thug") texKey = "enemy_bandit_thug";

        const portrait = this.add.image(0, 0, texKey);
        portrait.setDisplaySize(radius * 1.7, radius * 1.7);

        // 遮罩讓頭像變圓
        const mask = this.add.graphics();
        mask.fillStyle(0xffffff);
        mask.fillCircle(tx, ty, radius - 2);
        portrait.setMask(new Phaser.Display.Masks.GeometryMask(this, mask));

        // 血條背景
        const hpBarW = ts * 0.85;
        const hpBg = this.add.rectangle(0, -radius - 8, hpBarW, 5, 0x000000, 0.7);
        const hpFill = this.add.rectangle(0, -radius - 8, hpBarW * (unit.currentHp / unit.maxHp), 4,
          isPlayer ? 0x22c55e : 0xef4444, 1);
        hpFill.setName("hpFill");
        hpFill.setData("barWidth", hpBarW);

        // 名字
        const fontSize = Math.max(9, Math.floor(ts * 0.15));
        const nameText = this.add.text(0, radius + 5, unit.heroConfig.name, {
          fontSize: `${fontSize}px`,
          color: "#f8fafc",
          stroke: "#000000",
          strokeThickness: 3,
        }).setOrigin(0.5);

        container.add([glowCircle, bgCircle, portrait, hpBg, hpFill, nameText]);
        container.setInteractive(
          new Phaser.Geom.Circle(0, 0, radius),
          Phaser.Geom.Circle.Contains
        );

        if (isPlayer) this.input.setDraggable(container);

        container.on("pointerdown", () => {
          if (unit.faction === "PLAYER") {
            useBattleStore.getState().setSelectedUnitId(unit.instanceId);
          }
        });

        // 選中時脈衝動畫
        container.on("pointerover", () => {
          this.tweens.add({ targets: container, scaleX: 1.12, scaleY: 1.12, duration: 150, ease: "Power1" });
        });
        container.on("pointerout", () => {
          this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 150, ease: "Power1" });
        });

        this.unitContainers.set(unit.instanceId, container);
      }

      // 平滑移動
      if (Math.abs(container.x - tx) > 1 || Math.abs(container.y - ty) > 1) {
        this.tweens.add({ targets: container, x: tx, y: ty, duration: 280, ease: "Power2" });
      }

      // 更新血條
      const hpFill = container.getByName("hpFill") as Phaser.GameObjects.Rectangle;
      if (hpFill) {
        const bw = hpFill.getData("barWidth") as number;
        const ratio = Math.max(0, unit.currentHp / unit.maxHp);
        hpFill.setSize(Math.floor(bw * ratio), 4);
      }

      // 死亡淡出
      if (unit.isDead) {
        this.tweens.add({
          targets: container, alpha: 0, duration: 500,
          onComplete: () => container?.setVisible(false),
        });
      } else {
        container.setVisible(true).setAlpha(1);
      }
    });
  }
}
