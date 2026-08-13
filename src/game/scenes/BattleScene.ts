import * as Phaser from "phaser";
import { useBattleStore } from "@/stores/useBattleStore";
import { useDevStore } from "@/stores/useDevStore";
import { BattleUnit, CombatEvent } from "@/types/game";
import { gridToScreen, screenToGrid } from "@/game/utils/gridCoords";
import { REGION_COLORS } from "@/types/region";
import { EventBus, GAME_EVENTS } from "@/game/EventBus";
import { BattleUnitContainer } from "@/game/objects/BattleUnitContainer";
import { InputManager } from "@/game/controllers/InputManager";
import { CameraManager } from "@/game/controllers/CameraManager";

interface UnitSpriteContainer extends Phaser.GameObjects.Container {
  unitInstanceId?: string;
  gridCol?: number;
  gridRow?: number;
}

export class BattleScene extends Phaser.Scene {
  private unitContainers: Map<string, BattleUnitContainer> = new Map();
  private inputManager!: InputManager;
  private cameraManager!: CameraManager;
  private regionGraphics!: Phaser.GameObjects.Graphics;
  private gridMeshGraphics!: Phaser.GameObjects.Graphics;
  private fogTileSprite!: Phaser.GameObjects.TileSprite;
  private bushGraphics!: Phaser.GameObjects.Graphics;
  private tooltipText?: Phaser.GameObjects.Text;
  private storeUnsubscribe?: () => void;
  private devStoreUnsubscribe?: () => void;

  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    const sw = this.scale.width;
    const sh = this.scale.height;

    // 1. 山谷全螢幕背景
    this.addBackground();

    // 2. 右側古樹草叢伏擊區素材
    this.drawBushOverlay(sw, sh);

    // 3. 氣若柔絲 局部飄霧
    this.addDriftingFogLayer();

    // 4. 布陣階段戰術 4x10 網格線高亮圖層
    this.gridMeshGraphics = this.add.graphics();
    this.drawTacticalGridMesh(sw, sh);

    // 5. 多邊形圖層 (開發者模式)
    this.regionGraphics = this.add.graphics();
    this.drawPolygonsOverlay();

    // 6. 提示文字
    this.tooltipText = this.add.text(sw / 2, 30, "", {
      fontSize: "13px",
      color: "#fef08a",
      fontStyle: "bold",
      backgroundColor: "rgba(9, 9, 11, 0.85)",
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(200).setVisible(false);

    // 6.5 Helbreath 風格輸入控制器與事件監聽
    this.inputManager = new InputManager(this);
    
    // 6.6 Helbreath 大世界地圖攝影機跟隨系統 (Camera Manager)
    const mapWidth = 2400;
    const mapHeight = 1800;
    this.physics.world?.setBounds(0, 0, mapWidth, mapHeight);
    
    this.cameraManager = new CameraManager({
      scene: this,
      getFollowTarget: () => {
        let playerContainer: BattleUnitContainer | undefined;
        this.unitContainers.forEach((container) => {
          if (container.isPlayer) playerContainer = container;
        });
        return playerContainer ? { x: playerContainer.x, y: playerContainer.y } : undefined;
      },
    });
    this.cameraManager.setWorldBounds(mapWidth, mapHeight);

    // 滾輪控制視角縮放
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
      const currentZoom = this.cameras.main.zoom;
      const newZoom = deltaY > 0 ? currentZoom - 0.1 : currentZoom + 0.1;
      this.cameraManager.setZoom(newZoom);
    });

    EventBus.on(GAME_EVENTS.REQUEST_MOVE, (targetPos: { x: number; y: number }) => {
      // 轉換成大世界世界座標
      const worldPoint = this.cameras.main.getWorldPoint(targetPos.x, targetPos.y);
      this.unitContainers.forEach((container) => {
        if (container.isPlayer) {
          container.moveToTarget(worldPoint.x, worldPoint.y);
        }
      });
    });

    // 7. 訂閱 Store (單一真相源：單位數據與 CombatEvent 事件流 Playback)
    this.syncUnitsFromStore();

    this.storeUnsubscribe = useBattleStore.subscribe((state, prevState) => {
      if (state.units !== prevState.units) {
        this.drawTacticalGridMesh(this.scale.width, this.scale.height);
        this.updateUnitsVisual(state.units);
      }
      if (state.lastEvents !== prevState.lastEvents && state.lastEvents.length > 0) {
        this.playbackEvents(state.lastEvents);
      }
    });

    this.devStoreUnsubscribe = useDevStore.subscribe(() => {
      this.drawPolygonsOverlay();
    });

    // 8. 響應式 Resize（使用 scale.on("resize") 動態重算，嚴禁 scene.restart）
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.repositionElements(gameSize.width, gameSize.height);
    });

    // 9. 通知 React UI：Phaser 戰鬥場景已準備完畢 (EventBus)
    EventBus.emit(GAME_EVENTS.SCENE_READY, this);

    // 10. 生命週期銷毀時對稱取消訂閱
    this.events.once("shutdown", this.cleanup, this);
    this.events.once("destroy", this.cleanup, this);
  }

  private cleanup() {
    if (this.storeUnsubscribe) this.storeUnsubscribe();
    if (this.devStoreUnsubscribe) this.devStoreUnsubscribe();
    if (this.inputManager) this.inputManager.destroy();
    if (this.cameraManager) this.cameraManager.destroy();
    EventBus.off(GAME_EVENTS.REQUEST_MOVE);
    this.unitContainers.forEach((container) => {
      container.destroyContainer();
    });
    this.unitContainers.clear();
  }

  update(time: number, delta: number) {
    if (this.fogTileSprite) {
      this.fogTileSprite.tilePositionX += delta * 0.015;
      this.fogTileSprite.tilePositionY += delta * 0.004;
    }

    // 1. 每幀更新所有角色的移動插值 (Helbreath 尋路)
    this.unitContainers.forEach((container) => {
      container.update(time, delta);
    });

    // 2. WASD 實時向量移動控制
    if (this.inputManager) {
      const { dx, dy } = this.inputManager.update(delta);
      if (dx !== 0 || dy !== 0) {
        this.unitContainers.forEach((container) => {
          if (container.isPlayer) {
            container.moveByVector(dx, dy, delta);
          }
        });
      }
    }

    // 3. Helbreath 攝影機實時跟隨主角更新
    if (this.cameraManager) {
      this.cameraManager.update();
    }
  }

  private addBackground() {
    const mapW = 2400;
    const mapH = 1800;
    const texKey = this.textures.exists("forest_path_bg") ? "forest_path_bg" : "battle_bg";
    // 建立平鋪重複の大世界卷軸地圖 (Helbreath World Tilemap)
    const bgTile = this.add.tileSprite(mapW / 2, mapH / 2, mapW, mapH, texKey);
    bgTile.setAlpha(0.95);
  }

  private drawBushOverlay(sw: number, sh: number) {
    if (this.bushGraphics) this.bushGraphics.destroy();
    this.bushGraphics = this.add.graphics();
    const bx = sw * 0.72;
    const by = sh * 0.48;

    this.bushGraphics.fillStyle(0x064e3b, 0.75);
    this.bushGraphics.fillEllipse(bx, by, 180, 90);

    this.bushGraphics.fillStyle(0x047857, 0.85);
    this.bushGraphics.fillEllipse(bx - 20, by - 10, 140, 70);
    this.bushGraphics.fillEllipse(bx + 30, by + 10, 130, 65);

    this.bushGraphics.fillStyle(0x10b981, 0.9);
    this.bushGraphics.fillEllipse(bx - 10, by - 20, 100, 50);
    this.bushGraphics.fillEllipse(bx + 15, by - 15, 90, 45);

    const bushLabel = this.add.text(bx, by - 45, "🌿 側翼古樹草叢 (黃忠神箭伏擊位)", {
      fontSize: "12px",
      color: "#6ee7b7",
      fontStyle: "bold",
      stroke: "#064e3b",
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: bushLabel,
      y: by - 49,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /**
   * 布陣階段繪製清晰的 4x10 水墨金光戰術網格
   */
  private drawTacticalGridMesh(sw: number, sh: number) {
    if (!this.gridMeshGraphics) return;
    this.gridMeshGraphics.clear();

    const phase = useBattleStore.getState().phase;
    if (phase !== "DEPLOYMENT") return;

    // 繪製梯形透視網格線
    this.gridMeshGraphics.lineStyle(1.5, 0xf59e0b, 0.35);

    // 橫向 10 行分界線
    for (let r = 0; r <= 10; r++) {
      const pLeft = gridToScreen(0, r, sw, sh);
      const pRight = gridToScreen(3, r, sw, sh);
      this.gridMeshGraphics.lineBetween(pLeft.px - 35, pLeft.py, pRight.px + 35, pRight.py);
    }

    // 縱向 4 列分界線
    for (let c = 0; c <= 4; c++) {
      const pTop = gridToScreen(c - 0.5, 0, sw, sh);
      const pBottom = gridToScreen(c - 0.5, 9, sw, sh);
      this.gridMeshGraphics.lineBetween(pTop.px, pTop.py, pBottom.px, pBottom.py);
    }

    // 高亮側翼伏擊網格 (col: 3, row: 5)
    const ambushPos = gridToScreen(3, 5, sw, sh);
    this.gridMeshGraphics.fillStyle(0x10b981, 0.3);
    this.gridMeshGraphics.lineStyle(2, 0x34d399, 0.9);
    this.gridMeshGraphics.fillEllipse(ambushPos.px, ambushPos.py, 64, 26);
    this.gridMeshGraphics.strokeEllipse(ambushPos.px, ambushPos.py, 64, 26);
  }

  private addDriftingFogLayer() {
    const w = this.scale.width;
    const h = this.scale.height;

    if (this.textures.exists("fog_layer")) {
      this.fogTileSprite = this.add.tileSprite(w / 2, h * 0.35, w, h * 0.5, "fog_layer");
      this.fogTileSprite.setAlpha(0.28);
      this.fogTileSprite.setBlendMode(Phaser.BlendModes.SCREEN);

      this.tweens.add({
        targets: this.fogTileSprite,
        alpha: 0.42,
        duration: 4500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  private drawPolygonsOverlay() {
    if (!this.regionGraphics) return;
    this.regionGraphics.clear();

    const devState = useDevStore.getState();
    if (!devState.isDevMode) return;

    const sw = this.scale.width;
    const sh = this.scale.height;

    devState.regions.forEach((region) => {
      if (region.points.length < 3) return;
      const colorHex = parseInt(REGION_COLORS[region.type].stroke.replace("#", "0x"), 16);

      this.regionGraphics.lineStyle(2.5, colorHex, 0.95);
      this.regionGraphics.fillStyle(colorHex, 0.28);

      this.regionGraphics.beginPath();
      region.points.forEach((p, idx) => {
        const px = p.x * sw;
        const py = p.y * sh;
        if (idx === 0) this.regionGraphics.moveTo(px, py);
        else this.regionGraphics.lineTo(px, py);
      });
      this.regionGraphics.closePath();
      this.regionGraphics.fillPath();
      this.regionGraphics.strokePath();
    });
  }

  private syncUnitsFromStore() {
    this.updateUnitsVisual(useBattleStore.getState().units);
  }

  /**
   * 戰鬥事件流視覺 Playback 演出器
   */
  private playbackEvents(events: CombatEvent[]) {
    events.forEach((evt, idx) => {
      this.time.delayedCall(idx * 300, () => {
        if (evt.type === "SKILL_TRIGGERED" && evt.unitId) {
          const container = this.unitContainers.get(evt.unitId);
          if (container) {
            const skillText = this.add.text(container.x, container.y - 130, `✨【${evt.skillName || "武將特技"}】`, {
              fontSize: "18px",
              color: "#fef08a",
              fontStyle: "bold",
              stroke: "#92400e",
              strokeThickness: 4,
            }).setOrigin(0.5).setDepth(300);

            this.tweens.add({
              targets: skillText,
              y: container.y - 170,
              scaleX: 1.25,
              scaleY: 1.25,
              alpha: 0,
              duration: 1200,
              ease: "Power2.out",
              onComplete: () => skillText.destroy(),
            });
          }
        }

        if (evt.type === "ATTACK_HIT" && evt.targetId) {
          const targetContainer = this.unitContainers.get(evt.targetId);
          if (targetContainer) {
            const isCrit = evt.isCrit;
            const dmgText = this.add.text(
              targetContainer.x,
              targetContainer.y - 80,
              isCrit ? `💥 暴擊 ${evt.damage}` : `⚔️ -${evt.damage}`,
              {
                fontSize: isCrit ? "22px" : "16px",
                color: isCrit ? "#f59e0b" : "#ef4444",
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 4,
              }
            ).setOrigin(0.5).setDepth(310);

            this.tweens.add({
              targets: dmgText,
              y: targetContainer.y - 130,
              alpha: 0,
              duration: 1000,
              ease: "Back.out",
              onComplete: () => dmgText.destroy(),
            });

            // 震動打擊效果
            this.tweens.add({
              targets: targetContainer,
              x: targetContainer.x + (Math.random() > 0.5 ? 8 : -8),
              duration: 50,
              yoyo: true,
              repeat: 3,
            });
          }
        }

        if (evt.type === "PANIC_FLEE" && evt.fleeUnitIds) {
          evt.fleeUnitIds.forEach((fleeId) => {
            const container = this.unitContainers.get(fleeId);
            if (container) {
              const panicText = this.add.text(container.x, container.y - 90, "😱 大寨主死了！快逃啊！", {
                fontSize: "12px",
                color: "#fca5a5",
                fontStyle: "bold",
                stroke: "#7f1d1d",
                strokeThickness: 3,
              }).setOrigin(0.5).setDepth(290);

              this.tweens.add({
                targets: container,
                x: container.x + 350,
                alpha: 0,
                duration: 1200,
                ease: "Power2.in",
                onComplete: () => {
                  panicText.destroy();
                  container.setVisible(false);
                },
              });
            }
          });
        }
      });
    });
  }

  /**
   * 根據 Store 單一真相源整數網格座標 (col, row) 更新與渲染 2D 戰鬥單位
   * 借鑑 Helbreath 角色物件化設計，直接使用 BattleUnitContainer 進行更新
   */
  private updateUnitsVisual(units: BattleUnit[]) {
    const sw = this.scale.width;
    const sh = this.scale.height;

    units.forEach((unit) => {
      let container = this.unitContainers.get(unit.instanceId);

      // 尚未放置 (x < 0 或 y < 0) 不渲染
      if (unit.x < 0 || unit.y < 0) {
        if (container) container.setVisible(false);
        return;
      }

      if (!container) {
        container = new BattleUnitContainer(this, unit, sw, sh);
        this.unitContainers.set(unit.instanceId, container);
      } else {
        container.updateState(unit, sw, sh);
      }
    });
  }

  /**
   * 視窗 Resize 時的重算佈局（嚴禁調用 scene.restart()）
   */
  private repositionElements(sw: number, sh: number) {
    this.drawBushOverlay(sw, sh);
    this.drawTacticalGridMesh(sw, sh);
    this.drawPolygonsOverlay();
    this.updateUnitsVisual(useBattleStore.getState().units);
  }
}
