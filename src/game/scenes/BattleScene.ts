import * as Phaser from "phaser";
import { TILE_SIZE, MAP_SIZE } from "../config/constants";
import { STAGE_1_BANDIT } from "../config/stages";
import { useBattleStore } from "@/stores/useBattleStore";
import { BattleUnit } from "@/types/game";

export class BattleScene extends Phaser.Scene {
  private unitContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private tileSprites: Phaser.GameObjects.Sprite[][] = [];
  private highlightGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    // 1. 鋪設 2D 黑風山谷山水背景圖
    const bg = this.add.image(
      (MAP_SIZE * TILE_SIZE) / 2,
      (MAP_SIZE * TILE_SIZE) / 2,
      "battle_bg"
    );
    bg.setDisplaySize(MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE);
    bg.setAlpha(0.65);

    // 2. 鋪設 8x8 地形網格
    this.createMapGrid();
    this.highlightGraphics = this.add.graphics();

    // 3. 訂閱 Zustand Store 單位變化
    this.syncUnitsFromStore();
    useBattleStore.subscribe((state) => {
      this.updateUnitsVisual(state.units);
    });
  }

  private createMapGrid() {
    this.tileSprites = Array.from({ length: MAP_SIZE }, () => []);

    STAGE_1_BANDIT.tiles.forEach((tile) => {
      let textureKey = "tile_normal";
      if (tile.terrain === "BUSH") textureKey = "tile_bush";
      if (tile.terrain === "OBSTACLE") textureKey = "tile_obstacle";

      const sprite = this.add
        .sprite(
          tile.x * TILE_SIZE + TILE_SIZE / 2,
          tile.y * TILE_SIZE + TILE_SIZE / 2,
          textureKey
        )
        .setInteractive();

      // 點擊格子布陣
      sprite.on("pointerdown", () => {
        const store = useBattleStore.getState();
        if (store.phase === "DEPLOYMENT" && store.selectedUnitId) {
          const isSpawnTile = STAGE_1_BANDIT.playerSpawnTiles.some(
            (sp) => sp.x === tile.x && sp.y === tile.y
          );
          if (isSpawnTile && tile.terrain !== "OBSTACLE") {
            store.updateUnitPosition(store.selectedUnitId, tile.x, tile.y);
            store.addCombatLog(
              `📍 單位更新布陣位置至 (${tile.x}, ${tile.y})${
                tile.terrain === "BUSH" ? " 【進入草叢，可觸發伏擊！】" : ""
              }`,
              "info"
            );
          }
        }
      });

      this.tileSprites[tile.y][tile.x] = sprite;
    });

    this.drawDeploymentHighlights();
  }

  private drawDeploymentHighlights() {
    this.highlightGraphics.clear();
    const store = useBattleStore.getState();
    if (store.phase === "DEPLOYMENT") {
      this.highlightGraphics.lineStyle(2, 0xeab308, 0.9);
      STAGE_1_BANDIT.playerSpawnTiles.forEach((sp) => {
        this.highlightGraphics.strokeRect(
          sp.x * TILE_SIZE + 2,
          sp.y * TILE_SIZE + 2,
          TILE_SIZE - 4,
          TILE_SIZE - 4
        );
      });
    }
  }

  private syncUnitsFromStore() {
    const store = useBattleStore.getState();
    this.updateUnitsVisual(store.units);
  }

  private updateUnitsVisual(units: BattleUnit[]) {
    this.drawDeploymentHighlights();

    units.forEach((unit) => {
      let container = this.unitContainers.get(unit.instanceId);
      const targetX = unit.x * TILE_SIZE + TILE_SIZE / 2;
      const targetY = unit.y * TILE_SIZE + TILE_SIZE / 2;

      if (!container) {
        // 建立新 Token Container
        container = this.add.container(targetX, targetY);

        // 光圖案/外框色環
        const isPlayer = unit.faction === "PLAYER";
        const ringColor = isPlayer ? 0x3b82f6 : 0xef4444;

        // 背景底圈
        const bgCircle = this.add.circle(0, 0, 25, 0x0f172a, 0.9);
        bgCircle.setStrokeStyle(3, ringColor, 1);

        // 載入 2D 美術頭像圖
        let textureKey = "hero_protagonist";
        if (unit.heroConfig.id === "hero_huang_zhong") textureKey = "hero_huang_zhong";
        if (unit.heroConfig.id === "hero_xiahou_dun") textureKey = "hero_xiahou_dun";
        if (unit.heroConfig.id === "hero_zhao_yun") textureKey = "hero_zhao_yun";
        if (unit.heroConfig.id === "hero_guo_jia") textureKey = "hero_guo_jia";
        if (unit.heroConfig.id === "enemy_bandit_chief") textureKey = "enemy_bandit_chief";
        if (unit.heroConfig.id === "enemy_bandit_thug") textureKey = "enemy_bandit_thug";

        const portraitImg = this.add.image(0, 0, textureKey);
        portraitImg.setDisplaySize(44, 44);

        // 用形狀做圓形裁切 Mask
        const shapeMask = this.make.graphics({});
        shapeMask.fillStyle(0xffffff);
        shapeMask.fillCircle(targetX, targetY, 22);
        const mask = shapeMask.createGeometryMask();
        portraitImg.setMask(mask);

        // 血條圖案
        const hpBg = this.add.rectangle(0, -28, 44, 6, 0x000000, 0.8);
        const hpFill = this.add.rectangle(
          0,
          -28,
          42 * (unit.currentHp / unit.maxHp),
          4,
          isPlayer ? 0x22c55e : 0xef4444,
          1
        );
        hpFill.setName("hpFill");

        // 英雄姓名標籤
        const nameText = this.add
          .text(0, 26, unit.heroConfig.name, {
            fontSize: "10px",
            color: "#f8fafc",
            backgroundColor: "#0f172a",
            padding: { x: 3, y: 1 },
          })
          .setOrigin(0.5);

        container.add([bgCircle, portraitImg, hpBg, hpFill, nameText]);
        container.setInteractive(
          new Phaser.Geom.Circle(0, 0, 26),
          Phaser.Geom.Circle.Contains
        );

        // 點擊選擇單位
        container.on("pointerdown", () => {
          if (unit.faction === "PLAYER") {
            useBattleStore.getState().setSelectedUnitId(unit.instanceId);
          }
        });

        this.unitContainers.set(unit.instanceId, container);
      }

      // 平滑移動動畫
      if (container.x !== targetX || container.y !== targetY) {
        this.tweens.add({
          targets: container,
          x: targetX,
          y: targetY,
          duration: 300,
          ease: "Power2",
        });
      }

      // 更新血條度數
      const hpFill = container.getByName("hpFill") as Phaser.GameObjects.Rectangle;
      if (hpFill) {
        const ratio = Math.max(0, unit.currentHp / unit.maxHp);
        hpFill.setSize(Math.floor(42 * ratio), 4);
      }

      // 若已死亡，執行淡出
      if (unit.isDead) {
        this.tweens.add({
          targets: container,
          alpha: 0,
          duration: 400,
          onComplete: () => {
            container?.setVisible(false);
          },
        });
      } else {
        container.setVisible(true);
        container.setAlpha(1);
      }
    });
  }
}
