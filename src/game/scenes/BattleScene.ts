import * as Phaser from "phaser";
import { useBattleStore } from "@/stores/useBattleStore";
import { useDevStore } from "@/stores/useDevStore";
import { BattleUnit, CombatEvent } from "@/types/game";
import { gridToScreen, screenToGrid } from "@/game/utils/gridCoords";
import { REGION_COLORS } from "@/types/region";

interface UnitSpriteContainer extends Phaser.GameObjects.Container {
  unitInstanceId?: string;
  gridCol?: number;
  gridRow?: number;
}

export class BattleScene extends Phaser.Scene {
  private unitContainers: Map<string, UnitSpriteContainer> = new Map();
  private regionGraphics!: Phaser.GameObjects.Graphics;
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

    // 4. 多邊形圖層 (開發者模式)
    this.regionGraphics = this.add.graphics();
    this.drawPolygonsOverlay();

    // 5. 提示文字
    this.tooltipText = this.add.text(sw / 2, 30, "", {
      fontSize: "13px",
      color: "#fef08a",
      fontStyle: "bold",
      backgroundColor: "rgba(9, 9, 11, 0.85)",
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(200).setVisible(false);

    // 6. 訂閱 Store (單一真相源：單位數據與 CombatEvent 事件流 Playback)
    this.syncUnitsFromStore();

    this.storeUnsubscribe = useBattleStore.subscribe((state, prevState) => {
      this.updateUnitsVisual(state.units);
      if (state.lastEvents !== prevState.lastEvents && state.lastEvents.length > 0) {
        this.playbackEvents(state.lastEvents);
      }
    });

    this.devStoreUnsubscribe = useDevStore.subscribe(() => {
      this.drawPolygonsOverlay();
    });

    // 7. 響應式 Resize（使用 scale.on("resize") 動態重算，嚴禁 scene.restart）
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.repositionElements(gameSize.width, gameSize.height);
    });

    // 8. 生命週期銷毀時對稱取消訂閱
    this.events.once("shutdown", this.cleanup, this);
    this.events.once("destroy", this.cleanup, this);
  }

  private cleanup() {
    if (this.storeUnsubscribe) this.storeUnsubscribe();
    if (this.devStoreUnsubscribe) this.devStoreUnsubscribe();
    this.unitContainers.forEach((container) => {
      this.tweens.killTweensOf(container);
    });
    this.unitContainers.clear();
  }

  update(_time: number, delta: number) {
    if (this.fogTileSprite) {
      this.fogTileSprite.tilePositionX += delta * 0.015;
      this.fogTileSprite.tilePositionY += delta * 0.004;
    }
  }

  private addBackground() {
    const w = this.scale.width;
    const h = this.scale.height;
    const texKey = this.textures.exists("forest_path_bg") ? "forest_path_bg" : "battle_bg";
    const bg = this.add.image(w / 2, h / 2, texKey);
    bg.setDisplaySize(w, h);
    bg.setAlpha(0.95);
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

      // 使用統一網格轉換庫 gridToScreen 得到螢幕像素 (px, py)
      const { px, py, normY } = gridToScreen(unit.x, unit.y, sw, sh);
      const perspectiveScale = 0.7 + normY * 0.45;

      if (!container) {
        container = this.add.container(px, py) as UnitSpriteContainer;
        container.unitInstanceId = unit.instanceId;
        this.buildLive2DCharacter(container, unit, perspectiveScale);
        this.unitContainers.set(unit.instanceId, container);
      } else {
        this.buildLive2DCharacter(container, unit, perspectiveScale);
      }

      container.gridCol = unit.x;
      container.gridRow = unit.y;
      container.depth = Math.floor(py);

      this.tweens.add({
        targets: container,
        x: px,
        y: py,
        scaleX: perspectiveScale,
        scaleY: perspectiveScale,
        duration: 220,
        ease: "Power2",
      });

      if (unit.isDead) {
        this.tweens.add({
          targets: container,
          alpha: 0,
          duration: 350,
          onComplete: () => container?.setVisible(false),
        });
      } else {
        container.setVisible(true);
      }
    });
  }

  /**
   * 構建角色 (自動清除舊 Tween 徹底治理記憶體洩漏，整合 Hover 1.18x 放大暗示)
   */
  private buildLive2DCharacter(container: UnitSpriteContainer, unit: BattleUnit, baseScale: number) {
    // 釋放舊容器與動畫 Tween，徹底消滅洩漏
    this.tweens.killTweensOf(container);
    container.removeAll(true);

    const isPlayer = unit.faction === "PLAYER";
    const heroId = unit.heroConfig.id;

    // 判斷是否處於草叢伏擊 (col >= 2 且 row >= 4)
    const isAmbush = (unit.x >= 2 && unit.y >= 4 && unit.y <= 8) || unit.statusEffects.includes("AMBUSH");

    // 1. 光環底圖
    const auraColor = isPlayer
      ? heroId === "hero_huang_zhong"
        ? 0x10b981
        : heroId === "hero_xiahou_dun"
        ? 0xf59e0b
        : 0x3b82f6
      : 0xef4444;

    const baseDisk = this.add.graphics();
    baseDisk.fillStyle(auraColor, isAmbush ? 0.65 : 0.35);
    baseDisk.fillEllipse(0, 36, 72, 28);
    baseDisk.lineStyle(2.5, auraColor, 1);
    baseDisk.strokeEllipse(0, 36, 72, 28);

    // 2. 高清 100% 透明底角色立繪
    let live2dKey = "live2d_protagonist";
    if (heroId === "hero_huang_zhong") live2dKey = "live2d_huang_zhong";
    else if (heroId === "enemy_bandit_chief") live2dKey = "live2d_bandit_chief";
    else if (heroId === "enemy_bandit_thug") live2dKey = "live2d_bandit_thug";

    const charSprite = this.add.image(0, -32, live2dKey);
    charSprite.setDisplaySize(120, 150);

    if (isAmbush && heroId === "hero_huang_zhong") {
      container.setAlpha(0.62);
    } else {
      container.setAlpha(1.0);
    }

    // Live2D 骨骼呼吸
    this.tweens.add({
      targets: charSprite,
      y: -36,
      scaleY: charSprite.scaleY * 1.04,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 3. 血條與名稱
    const hpBarW = 64;
    const hpBg = this.add.rectangle(0, -112, hpBarW, 6, 0x000000, 0.85);
    const hpFill = this.add.rectangle(
      -hpBarW / 2, -112,
      hpBarW * Math.max(0, unit.currentHp / unit.maxHp), 5,
      isPlayer ? 0x22c55e : 0xef4444, 1
    ).setOrigin(0, 0.5);

    const nameText = this.add.text(0, 52, `${unit.heroConfig.name} (${unit.x},${unit.y})`, {
      fontSize: "11px",
      color: isPlayer ? "#fef08a" : "#fca5a5",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3.5,
    }).setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [baseDisk, charSprite, hpBg, hpFill, nameText];

    if (isAmbush) {
      const ambushTag = this.add.text(0, -126, "🌿 半隱身 (神箭伏擊)", {
        fontSize: "10px",
        color: "#6ee7b7",
        fontStyle: "bold",
        stroke: "#064e3b",
        strokeThickness: 3,
      }).setOrigin(0.5);
      children.push(ambushTag);
    }

    container.add(children);

    // 4. ⭐ Hover 懸停 1.18 倍放大暗示與手勢切換
    container.setInteractive(
      new Phaser.Geom.Rectangle(-50, -110, 100, 160),
      Phaser.Geom.Rectangle.Contains
    );

    container.on("pointerover", () => {
      if (isPlayer) {
        this.input.setDefaultCursor("grab");
        if (this.tooltipText) {
          this.tooltipText
            .setText(`🖱️ [${unit.heroConfig.name}] 網格(${unit.x},${unit.y}) - 按住拖拽調整戰術站位`)
            .setVisible(true);
        }
      } else {
        this.input.setDefaultCursor("pointer");
        if (this.tooltipText) {
          this.tooltipText
            .setText(`⚔️ [${unit.heroConfig.name}] 網格(${unit.x},${unit.y}) HP:${unit.currentHp}/${unit.maxHp}`)
            .setVisible(true);
        }
      }

      this.tweens.add({
        targets: container,
        scaleX: baseScale * 1.18,
        scaleY: baseScale * 1.18,
        duration: 140,
        ease: "Power2.out",
      });

      baseDisk.lineStyle(3.5, 0xf59e0b, 1);
      baseDisk.strokeEllipse(0, 36, 76, 32);
    });

    container.on("pointerout", () => {
      this.input.setDefaultCursor("default");
      if (this.tooltipText) this.tooltipText.setVisible(false);

      this.tweens.add({
        targets: container,
        scaleX: baseScale,
        scaleY: baseScale,
        duration: 140,
        ease: "Power2.out",
      });

      baseDisk.lineStyle(2.5, auraColor, 1);
      baseDisk.strokeEllipse(0, 36, 72, 28);
    });

    // 5. 場面拖拽
    if (isPlayer) {
      this.input.setDraggable(container);

      container.on("dragstart", () => {
        this.input.setDefaultCursor("grabbing");
        this.tweens.add({
          targets: container,
          scaleX: baseScale * 1.28,
          scaleY: baseScale * 1.28,
          duration: 120,
          ease: "Power2.out",
        });
      });

      container.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (useBattleStore.getState().phase === "DEPLOYMENT") {
          container.x = dragX;
          container.y = dragY;
        }
      });

      container.on("dragend", () => {
        this.input.setDefaultCursor("grab");
        if (useBattleStore.getState().phase === "DEPLOYMENT") {
          const sw = this.scale.width;
          const sh = this.scale.height;

          // 使用網格轉換庫將拖拽終點像素 safe-map 轉換為 4x10 整數網格
          const gridPos = screenToGrid(container.x, container.y, sw, sh);

          useBattleStore.getState().setUnits(
            useBattleStore.getState().units.map((u) =>
              u.instanceId === unit.instanceId ? { ...u, x: gridPos.col, y: gridPos.row } : u
            )
          );
        }
      });
    }
  }

  /**
   * 視窗 Resize 時的重算佈局（嚴禁調用 scene.restart()）
   */
  private repositionElements(sw: number, sh: number) {
    this.drawBushOverlay(sw, sh);
    this.drawPolygonsOverlay();
    this.updateUnitsVisual(useBattleStore.getState().units);
  }
}
