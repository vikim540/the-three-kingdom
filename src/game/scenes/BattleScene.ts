import * as Phaser from "phaser";
import { TILE_SIZE, MAP_COLS, MAP_ROWS } from "../config/constants";
import { STAGE_1_BANDIT } from "../config/stages";
import { useBattleStore } from "@/stores/useBattleStore";
import { BattleUnit } from "@/types/game";

interface UnitContainer extends Phaser.GameObjects.Container {
  unitInstanceId?: string;
}

export class BattleScene extends Phaser.Scene {
  private unitContainers: Map<string, UnitContainer> = new Map();
  private tileSprites: Phaser.GameObjects.Sprite[][] = [];
  private highlightGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    const canvasW = MAP_COLS * TILE_SIZE; // 288px
    const canvasH = MAP_ROWS * TILE_SIZE; // 720px

    // 1. 鋪設 16:9 高清修仙密林山道戰場背景圖
    if (this.textures.exists("forest_path_bg")) {
      const bg = this.add.image(canvasW / 2, canvasH / 2, "forest_path_bg");
      bg.setDisplaySize(canvasW, canvasH);
      bg.setAlpha(0.9);
    } else {
      this.add.image(canvasW / 2, canvasH / 2, "fallback_bg");
    }

    // 2. 初始化高亮圖案與 4x10 地形網格
    this.highlightGraphics = this.add.graphics();
    this.createMapGrid();

    // 3. 啟用拖拽擺位監聽器 (Drag & Drop)
    this.enableDragAndDropPlacement();

    // 4. 訂閱 Zustand Store 單位變化
    this.syncUnitsFromStore();
    useBattleStore.subscribe((state) => {
      this.updateUnitsVisual(state.units);
    });
  }

  private createMapGrid() {
    this.tileSprites = Array.from({ length: MAP_ROWS }, () => []);

    STAGE_1_BANDIT.tiles.forEach((tile) => {
      let textureKey = "tile_normal";
      if (tile.terrain === "BUSH") textureKey = "tile_bush";
      if (tile.terrain === "FOREST") textureKey = "tile_forest";
      if (tile.terrain === "OBSTACLE") textureKey = "tile_obstacle";
      if (tile.terrain === "ESCAPE") textureKey = "tile_escape";

      const tileX = tile.x * TILE_SIZE + TILE_SIZE / 2;
      const tileY = tile.y * TILE_SIZE + TILE_SIZE / 2;

      const sprite = this.add
        .sprite(tileX, tileY, textureKey)
        .setInteractive();

      // 地形標籤文字（清淅可見）
      if (tile.terrain === "BUSH") {
        this.add
          .text(tileX, tileY + 20, "🌿伏擊", {
            fontSize: "10px",
            color: "#6ee7b7",
            backgroundColor: "#064e3b",
            padding: { x: 2, y: 1 },
          })
          .setOrigin(0.5);
      } else if (tile.terrain === "ESCAPE") {
        this.add
          .text(tileX, tileY + 20, "🌀逃生法陣", {
            fontSize: "10px",
            color: "#7dd3fc",
            backgroundColor: "#0c4a6e",
            padding: { x: 2, y: 1 },
          })
          .setOrigin(0.5);
      }

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
    if (!this.highlightGraphics) {
      this.highlightGraphics = this.add.graphics();
    }
    this.highlightGraphics.clear();

    const store = useBattleStore.getState();
    if (store.phase === "DEPLOYMENT") {
      // 繪製高亮金黃色布陣區域邊框 (Row 8 & Row 9)
      this.highlightGraphics.lineStyle(3, 0xfacc15, 1);
      STAGE_1_BANDIT.playerSpawnTiles.forEach((sp) => {
        this.highlightGraphics.strokeRect(
          sp.x * TILE_SIZE + 3,
          sp.y * TILE_SIZE + 3,
          TILE_SIZE - 6,
          TILE_SIZE - 6
        );
      });

      // 高亮逃生法陣邊框 (1,9) 及 (2,9)
      this.highlightGraphics.lineStyle(3, 0x38bdf8, 1);
      this.highlightGraphics.strokeRect(
        1 * TILE_SIZE + 2,
        9 * TILE_SIZE + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );
      this.highlightGraphics.strokeRect(
        2 * TILE_SIZE + 2,
        9 * TILE_SIZE + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );
    }
  }

  private enableDragAndDropPlacement() {
    this.input.on("drag", (_pointer: Phaser.Input.Pointer, gameObject: UnitContainer, dragX: number, dragY: number) => {
      const store = useBattleStore.getState();
      if (store.phase === "DEPLOYMENT") {
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    });

    this.input.on("dragend", (_pointer: Phaser.Input.Pointer, gameObject: UnitContainer) => {
      const store = useBattleStore.getState();
      if (store.phase === "DEPLOYMENT") {
        const instanceId = gameObject.unitInstanceId;
        const gridX = Math.floor(gameObject.x / TILE_SIZE);
        const gridY = Math.floor(gameObject.y / TILE_SIZE);

        const isSpawnTile = STAGE_1_BANDIT.playerSpawnTiles.some(
          (sp) => sp.x === gridX && sp.y === gridY
        );

        if (instanceId && isSpawnTile && gridX >= 0 && gridX < MAP_COLS && gridY >= 0 && gridY < MAP_ROWS) {
          store.updateUnitPosition(instanceId, gridX, gridY);
          store.addCombatLog(`🖐️ 拖拽單位擺位至 (${gridX}, ${gridY})`, "info");
        } else {
          // 復原原位
          const unit = store.units.find((u) => u.instanceId === instanceId);
          if (unit) {
            gameObject.x = unit.x * TILE_SIZE + TILE_SIZE / 2;
            gameObject.y = unit.y * TILE_SIZE + TILE_SIZE / 2;
          }
        }
      }
    });
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
        container = this.add.container(targetX, targetY) as UnitContainer;
        container.unitInstanceId = unit.instanceId;

        const isPlayer = unit.faction === "PLAYER";
        const ringColor = isPlayer ? 0x3b82f6 : 0xef4444;

        // 背景底圈與外框
        const bgCircle = this.add.circle(0, 0, 26, 0x0f172a, 0.95);
        bgCircle.setStrokeStyle(3, ringColor, 1);

        // 載入 2D 頭像圖
        let textureKey = "hero_protagonist";
        if (unit.heroConfig.id === "hero_huang_zhong") textureKey = "hero_huang_zhong";
        if (unit.heroConfig.id === "hero_xiahou_dun") textureKey = "hero_xiahou_dun";
        if (unit.heroConfig.id === "hero_zhao_yun") textureKey = "hero_zhao_yun";
        if (unit.heroConfig.id === "hero_guo_jia") textureKey = "hero_guo_jia";
        if (unit.heroConfig.id === "enemy_bandit_chief") textureKey = "enemy_bandit_chief";
        if (unit.heroConfig.id === "enemy_bandit_thug") textureKey = "enemy_bandit_thug";

        const portraitImg = this.add.image(0, 0, textureKey);
        portraitImg.setDisplaySize(44, 44);

        // 血條圖案
        const hpBg = this.add.rectangle(0, -30, 46, 6, 0x000000, 0.85);
        const hpFill = this.add.rectangle(
          0,
          -30,
          44 * (unit.currentHp / unit.maxHp),
          4,
          isPlayer ? 0x22c55e : 0xef4444,
          1
        );
        hpFill.setName("hpFill");

        // 英雄姓名標籤
        const nameText = this.add
          .text(0, 28, unit.heroConfig.name, {
            fontSize: "11px",
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

        // 若為玩家單位，啟用拖拽 (Draggable)
        if (isPlayer) {
          this.input.setDraggable(container);
        }

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
        hpFill.setSize(Math.floor(44 * ratio), 4);
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
