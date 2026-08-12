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
    this.createMapGrid();
    this.highlightGraphics = this.add.graphics();

    // 訂閱 Zustand Store 單位與狀態變化
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

    // 繪製布陣高亮區域 (Row 6, Row 7)
    this.drawDeploymentHighlights();
  }

  private drawDeploymentHighlights() {
    this.highlightGraphics.clear();
    const store = useBattleStore.getState();
    if (store.phase === "DEPLOYMENT") {
      this.highlightGraphics.lineStyle(2, 0xeab308, 0.8);
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

        // 外框光圈
        const circleColor = unit.faction === "PLAYER" ? 0x3b82f6 : 0xef4444;
        const outerCircle = this.add.circle(0, 0, 24, circleColor, 0.8);
        outerCircle.setStrokeStyle(2, 0xffffff, 0.9);

        // 角色 Avatar 文字
        const avatarText = this.add
          .text(0, -2, unit.heroConfig.avatar, {
            fontSize: "24px",
          })
          .setOrigin(0.5);

        // 名稱
        const nameText = this.add
          .text(0, 26, unit.heroConfig.name, {
            fontSize: "11px",
            color: "#f8fafc",
            backgroundColor: "#0f172a",
            padding: { x: 4, y: 2 },
          })
          .setOrigin(0.5);

        container.add([outerCircle, avatarText, nameText]);
        container.setInteractive(
          new Phaser.Geom.Circle(0, 0, 24),
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

      // 若已死亡，執行淡出並隱藏
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
