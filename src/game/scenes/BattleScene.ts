import * as Phaser from "phaser";
import { useBattleStore } from "@/stores/useBattleStore";
import { useDevStore } from "@/stores/useDevStore";
import { BattleUnit } from "@/types/game";
import { getPerspectiveScale, REGION_COLORS } from "@/types/region";

interface UnitSpriteContainer extends Phaser.GameObjects.Container {
  unitInstanceId?: string;
  normX?: number;
  normY?: number;
}

export class BattleScene extends Phaser.Scene {
  private unitContainers: Map<string, UnitSpriteContainer> = new Map();
  private regionGraphics!: Phaser.GameObjects.Graphics;
  private fogTileSprite!: Phaser.GameObjects.TileSprite;

  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    // 1. 全螢幕山谷背景圖
    this.addBackground();

    // 2. 氣若柔絲 局部雨霧飄動層
    this.addDriftingFogLayer();

    // 3. 多邊形區域繪製圖層 (僅在開發者模式下顯示)
    this.regionGraphics = this.add.graphics();
    this.drawPolygonsOverlay();

    // 4. 訂閱 Zustand Store
    this.syncUnitsFromStore();

    useBattleStore.subscribe((state) => {
      this.updateUnitsVisual(state.units);
    });

    useDevStore.subscribe(() => {
      this.drawPolygonsOverlay();
    });

    // 5. 螢幕 resize 時重新整頓
    this.scale.on("resize", () => {
      this.scene.restart();
    });
  }

  update(_time: number, delta: number) {
    // 動態山林雨霧飄動動畫 (氣若柔絲 緩慢漂移)
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

  /**
   * 添加氣若柔絲 局部飄動雨霧
   */
  private addDriftingFogLayer() {
    const w = this.scale.width;
    const h = this.scale.height;

    if (this.textures.exists("fog_layer")) {
      this.fogTileSprite = this.add.tileSprite(w / 2, h * 0.35, w, h * 0.5, "fog_layer");
      this.fogTileSprite.setAlpha(0.28);
      this.fogTileSprite.setBlendMode(Phaser.BlendModes.SCREEN);

      // 間歇出現 氣若柔絲 呼吸動效
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

  /**
   * 繪製開發者模式的多邊形區域邊界
   */
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
   * 建立與更新「Live2D 動態戰鬥角色」單位 Container
   */
  private updateUnitsVisual(units: BattleUnit[]) {
    const sw = this.scale.width;
    const sh = this.scale.height;

    units.forEach((unit) => {
      let container = this.unitContainers.get(unit.instanceId);

      // 尚未放置的單位 (x < 0 或 y < 0) 在場面中暫不渲染
      if (unit.x < 0 || unit.y < 0) {
        if (container) container.setVisible(false);
        return;
      }

      // 歸一化座標 (0 ~ 1) 轉成畫面像素座標 (px, py)
      const px = unit.x <= 1.0 ? unit.x * sw : unit.x;
      const py = unit.y <= 1.0 ? unit.y * sh : unit.y;
      const normY = py / sh;
      const perspectiveScale = getPerspectiveScale(normY);

      if (!container) {
        container = this.add.container(px, py) as UnitSpriteContainer;
        container.unitInstanceId = unit.instanceId;

        // 構建 Live2D 2D 動態角色 (無任何 SVG)
        this.buildLive2DCharacter(container, unit);
        this.unitContainers.set(unit.instanceId, container);
      }

      container.normX = px / sw;
      container.normY = normY;
      container.depth = Math.floor(py);

      // 平滑移動與透視縮放
      this.tweens.add({
        targets: container,
        x: px,
        y: py,
        scaleX: perspectiveScale,
        scaleY: perspectiveScale,
        duration: 280,
        ease: "Power2",
      });

      // 更新血條
      const hpFill = container.getByName("unitHpFill") as Phaser.GameObjects.Rectangle;
      if (hpFill) {
        const fullW = 64;
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
   * 構建 Live2D 動態戰鬥角色 (無任何 SVG 圖片，完全使用高清立繪 + Live2D 骨骼呼吸 physics)
   */
  private buildLive2DCharacter(container: UnitSpriteContainer, unit: BattleUnit) {
    container.removeAll(true);

    const isPlayer = unit.faction === "PLAYER";
    const heroId = unit.heroConfig.id;
    const isAmbush = unit.statusEffects.includes("AMBUSH");

    // 1. 2D 腳下陣芒光環與描邊光圈
    const qualityColors: Record<string, number> = {
      PLAYER: 0x10b981,
      ENEMY: 0xef4444,
    };
    const auraColor = isPlayer ? (heroId === "hero_huang_zhong" ? 0xf59e0b : 0x3b82f6) : 0xef4444;

    const baseDisk = this.add.graphics();
    baseDisk.fillStyle(auraColor, 0.32);
    baseDisk.fillEllipse(0, 36, 64, 24);
    baseDisk.lineStyle(2.5, auraColor, 1);
    baseDisk.strokeEllipse(0, 36, 64, 24);

    this.tweens.add({
      targets: baseDisk,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 2. 選擇對應 Live2D 高清立繪 Texture
    let live2dKey = "live2d_protagonist";
    if (heroId === "hero_huang_zhong") live2dKey = "live2d_huang_zhong";
    else if (heroId === "enemy_bandit_chief") live2dKey = "live2d_bandit_chief";
    else if (heroId === "enemy_bandit_thug") live2dKey = "live2d_bandit_thug";

    const charSprite = this.add.image(0, -32, live2dKey);
    charSprite.setDisplaySize(120, 150);

    // Live2D 呼吸與肌肉張弛 physics Tween (頭部/軀幹微位移 + 呼吸縮放)
    this.tweens.add({
      targets: charSprite,
      y: -36,
      scaleY: charSprite.scaleY * 1.04,
      scaleX: charSprite.scaleX * 0.98,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 3. 頂部血條與名稱
    const hpBarW = 64;
    const hpBg = this.add.rectangle(0, -112, hpBarW, 6, 0x000000, 0.85);
    const hpFill = this.add.rectangle(
      -hpBarW / 2, -112,
      hpBarW * (unit.currentHp / unit.maxHp), 5,
      isPlayer ? 0x22c55e : 0xef4444, 1
    ).setOrigin(0, 0.5);
    hpFill.setName("unitHpFill");

    const nameText = this.add.text(0, 52, unit.heroConfig.name, {
      fontSize: "11px",
      color: isPlayer ? "#fef08a" : "#fca5a5",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3.5,
    }).setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [baseDisk, charSprite, hpBg, hpFill, nameText];

    if (isAmbush) {
      const ambushTag = this.add.text(0, -124, "🌿 伏擊中", {
        fontSize: "10px",
        color: "#6ee7b7",
        stroke: "#064e3b",
        strokeThickness: 3,
      }).setOrigin(0.5);
      children.push(ambushTag);
    }

    container.add(children);

    // 4. 互動、懸停放大與拖拽手勢
    container.setInteractive(
      new Phaser.Geom.Rectangle(-50, -110, 100, 160),
      Phaser.Geom.Rectangle.Contains
    );

    if (isPlayer) {
      this.input.setDraggable(container);

      container.on("dragstart", () => {
        this.tweens.add({
          targets: container,
          scaleX: container.scaleX * 1.25,
          scaleY: container.scaleY * 1.25,
          duration: 150,
          ease: "Power2",
        });
      });

      container.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (useBattleStore.getState().phase === "DEPLOYMENT") {
          container.x = dragX;
          container.y = dragY;
        }
      });

      container.on("dragend", () => {
        if (useBattleStore.getState().phase === "DEPLOYMENT") {
          const sw = this.scale.width;
          const sh = this.scale.height;
          const normX = Number((container.x / sw).toFixed(3));
          const normY = Number((container.y / sh).toFixed(3));

          useBattleStore.getState().setUnits(
            useBattleStore.getState().units.map((u) =>
              u.instanceId === unit.instanceId ? { ...u, x: normX, y: normY } : u
            )
          );
        }
      });
    }

    // 懸停放大與手勢提示
    container.on("pointerover", () => {
      this.tweens.add({
        targets: container,
        scaleX: container.scaleX * 1.15,
        scaleY: container.scaleY * 1.15,
        duration: 120,
        ease: "Power1",
      });
    });

    container.on("pointerout", () => {
      const normY = container.y / this.scale.height;
      const targetScale = getPerspectiveScale(normY);
      this.tweens.add({
        targets: container,
        scaleX: targetScale,
        scaleY: targetScale,
        duration: 120,
        ease: "Power1",
      });
    });

    container.on("pointerdown", () => {
      if (unit.faction === "PLAYER") {
        useBattleStore.getState().setSelectedUnitId(unit.instanceId);
      }
    });
  }
}
