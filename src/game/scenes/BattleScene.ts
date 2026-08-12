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
   * 建立與更新「Live2D 動態骨骼戰鬥角色」單位 Container
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

        // 構建 Live2D 2D 骨骼多層動態角色
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
   * 構建動態 Live2D 多部位骨骼角色
   */
  private buildLive2DCharacter(container: UnitSpriteContainer, unit: BattleUnit) {
    container.removeAll(true);

    const isPlayer = unit.faction === "PLAYER";
    const heroId = unit.heroConfig.id;

    // 根據角色 ID 構建專屬 Live2D 部位
    if (heroId === "hero_huang_zhong") {
      this.buildHuangZhongLive2D(container, unit);
    } else if (heroId === "enemy_bandit_chief") {
      this.buildBanditChiefLive2D(container, unit);
    } else if (heroId === "enemy_bandit_thug") {
      this.buildBanditThugLive2D(container, unit);
    } else {
      this.buildProtagonistLive2D(container, unit);
    }

    // 互動與拖拽事件
    container.setInteractive(
      new Phaser.Geom.Rectangle(-45, -100, 90, 145),
      Phaser.Geom.Rectangle.Contains
    );

    if (isPlayer) {
      this.input.setDraggable(container);

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

    container.on("pointerdown", () => {
      if (unit.faction === "PLAYER") {
        useBattleStore.getState().setSelectedUnitId(unit.instanceId);
      }
    });
  }

  /**
   * 【Live2D 黃忠 - 蜀山老箭仙】
   * 包含：陣芒光環 + 龍鱗戰甲 + 呼吸胸腔 + 動態飄逸白鬚 + 眨眼 + 綠龍神弓懸浮
   */
  private buildHuangZhongLive2D(container: UnitSpriteContainer, unit: BattleUnit) {
    const isAmbush = unit.statusEffects.includes("AMBUSH");

    // Layer 1: 腳下綠龍修仙陣芒底盤 (Live2D 呼吸光波)
    const baseDisk = this.add.graphics();
    baseDisk.fillStyle(0x10b981, 0.32);
    baseDisk.fillEllipse(0, 32, 58, 22);
    baseDisk.lineStyle(2.5, 0x34d399, 1);
    baseDisk.strokeEllipse(0, 32, 58, 22);

    this.tweens.add({
      targets: baseDisk,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Layer 2: Live2D 軀幹與龍鱗綠袍
    const bodyG = this.add.graphics();
    bodyG.fillStyle(0x064e3b, 1);
    bodyG.fillTriangle(-22, 28, 22, 28, 0, -25);
    bodyG.lineStyle(2, 0x34d399, 1);
    bodyG.strokeTriangle(-22, 28, 22, 28, 0, -25);

    // 金屬肩甲
    bodyG.fillStyle(0xf59e0b, 1);
    bodyG.fillCircle(-22, -15, 8);
    bodyG.fillCircle(22, -15, 8);

    // Layer 3: 白鬚與面龐 (Live2D 飄逸骨骼)
    const headGroup = this.add.container(0, -38);

    const faceG = this.add.graphics();
    faceG.fillStyle(0x1e293b, 1);
    faceG.fillCircle(0, 0, 18);
    faceG.lineStyle(2, 0xfbbf24, 1);
    faceG.strokeCircle(0, 0, 18);

    // 仙將白鬚 (飄動動畫)
    const beardG = this.add.graphics();
    beardG.fillStyle(0xf8fafc, 1);
    beardG.fillTriangle(-12, 5, 12, 5, 0, 32);
    beardG.lineStyle(1.5, 0xcbd5e1, 1);
    beardG.strokeTriangle(-12, 5, 12, 5, 0, 32);

    this.tweens.add({
      targets: beardG,
      scaleY: 1.15,
      rotation: 0.05,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 金羽頭盔
    const helmetG = this.add.graphics();
    helmetG.fillStyle(0xd97706, 1);
    helmetG.fillTriangle(-16, -6, 16, -6, 0, -24);
    helmetG.fillStyle(0xef4444, 1);
    helmetG.fillCircle(0, -24, 4);

    // 雙眼 (眨眼 Tween)
    const eyeLeft = this.add.circle(-6, -2, 2.5, 0xfbbf24);
    const eyeRight = this.add.circle(6, -2, 2.5, 0xfbbf24);

    this.time.addEvent({
      delay: 3200,
      loop: true,
      callback: () => {
        eyeLeft.setScale(1, 0.1);
        eyeRight.setScale(1, 0.1);
        this.time.delayedCall(150, () => {
          eyeLeft.setScale(1, 1);
          eyeRight.setScale(1, 1);
        });
      },
    });

    headGroup.add([faceG, beardG, helmetG, eyeLeft, eyeRight]);

    // Layer 4: Live2D 神箭仙弓 (動態懸浮與張弓姿勢)
    const bowGroup = this.add.container(-28, -25);
    const bowG = this.add.graphics();
    bowG.lineStyle(4, 0xfbbf24, 1);
    bowG.beginPath();
    bowG.arc(0, 0, 26, -Phaser.Math.DEG_TO_RAD * 100, Phaser.Math.DEG_TO_RAD * 100, false);
    bowG.strokePath();

    // 弦與箭
    const bowString = this.add.line(0, 0, 0, -25, 0, 25, 0xffffff, 0.95);
    const arrow = this.add.graphics();
    arrow.fillStyle(0x34d399, 1);
    arrow.fillTriangle(0, 0, 30, -5, 30, 5);
    arrow.lineStyle(2, 0xfbbf24, 1);
    arrow.strokeTriangle(0, 0, 30, -5, 30, 5);

    bowGroup.add([bowG, bowString, arrow]);

    this.tweens.add({
      targets: bowGroup,
      x: -32,
      rotation: 0.1,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 軀幹 Live2D 呼吸動畫
    this.tweens.add({
      targets: [bodyG, headGroup],
      y: "-=3",
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 5. 頂部血條與名字
    const UIProps = this.buildUIProps(unit, isAmbush);

    container.add([baseDisk, bodyG, headGroup, bowGroup, ...UIProps]);
  }

  /**
   * 【Live2D 獨眼寨主 - 黑風山首領】
   * 包含：血煞鬼氣 + 虎皮肩甲 + 獨眼罩 + 刀身紅光血霧 + 狂暴肌肉呼吸
   */
  private buildBanditChiefLive2D(container: UnitSpriteContainer, unit: BattleUnit) {
    // Layer 1: 腳下狂暴血煞光環
    const baseDisk = this.add.graphics();
    baseDisk.fillStyle(0xef4444, 0.35);
    baseDisk.fillEllipse(0, 32, 60, 24);
    baseDisk.lineStyle(2.5, 0xef4444, 1);
    baseDisk.strokeEllipse(0, 32, 60, 24);

    this.tweens.add({
      targets: baseDisk,
      alpha: 0.6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Power1",
    });

    // Layer 2: 悍匪粗暴身軀
    const bodyG = this.add.graphics();
    bodyG.fillStyle(0x450a0a, 1);
    bodyG.fillTriangle(-24, 28, 24, 28, 0, -22);
    bodyG.lineStyle(2, 0xef4444, 1);
    bodyG.strokeTriangle(-24, 28, 24, 28, 0, -22);

    // 虎皮肩章
    bodyG.fillStyle(0xf59e0b, 1);
    bodyG.fillCircle(-24, -14, 9);
    bodyG.fillCircle(24, -14, 9);

    // Layer 3: 獨眼面龐
    const headGroup = this.add.container(0, -36);
    const faceG = this.add.graphics();
    faceG.fillStyle(0x27272a, 1);
    faceG.fillCircle(0, 0, 19);
    faceG.lineStyle(2, 0xef4444, 1);
    faceG.strokeCircle(0, 0, 19);

    // 獨眼罩
    const eyepatch = this.add.graphics();
    eyepatch.lineStyle(3, 0x000000, 1);
    eyepatch.lineBetween(-16, -8, 16, 8);
    eyepatch.fillStyle(0x000000, 1);
    eyepatch.fillCircle(-6, -2, 6);

    // 獨眼凶光 (動態脈沖)
    const redEye = this.add.circle(7, -2, 3.5, 0xef4444);
    this.tweens.add({
      targets: redEye,
      scale: 1.4,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    headGroup.add([faceG, eyepatch, redEye]);

    // Layer 4: 鬼煞大刀 (血霧呼吸)
    const bladeGroup = this.add.container(26, -22);
    const bladeG = this.add.graphics();
    bladeG.fillStyle(0xdc2626, 1);
    bladeG.fillTriangle(0, 20, 18, -40, -4, -40);
    bladeG.lineStyle(2, 0xffffff, 1);
    bladeG.strokeTriangle(0, 20, 18, -40, -4, -40);

    bladeGroup.add(bladeG);

    this.tweens.add({
      targets: bladeGroup,
      rotation: 0.12,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 肌肉呼吸 Tween
    this.tweens.add({
      targets: [bodyG, headGroup],
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    const UIProps = this.buildUIProps(unit, false);
    container.add([baseDisk, bodyG, headGroup, bladeGroup, ...UIProps]);
  }

  /**
   * 【Live2D 黑風嘍囉】
   */
  private buildBanditThugLive2D(container: UnitSpriteContainer, unit: BattleUnit) {
    const baseDisk = this.add.graphics();
    baseDisk.fillStyle(0xf97316, 0.3);
    baseDisk.fillEllipse(0, 30, 48, 18);

    const bodyG = this.add.graphics();
    bodyG.fillStyle(0x7c2d12, 1);
    bodyG.fillTriangle(-18, 25, 18, 25, 0, -18);

    const headG = this.add.graphics();
    headG.fillStyle(0x3f3f46, 1);
    headG.fillCircle(0, -28, 14);
    headG.fillStyle(0xdc2626, 1);
    headG.fillTriangle(-12, -32, 12, -32, 0, -42); // 紅頭巾

    // 雙斧
    const axeG = this.add.graphics();
    axeG.fillStyle(0x71717a, 1);
    axeG.fillTriangle(-24, -20, -32, -32, -18, -32);
    axeG.fillTriangle(24, -20, 32, -32, 18, -32);

    this.tweens.add({
      targets: [bodyG, headG, axeG],
      y: "-=2",
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    const UIProps = this.buildUIProps(unit, false);
    container.add([baseDisk, bodyG, headG, axeG, ...UIProps]);
  }

  /**
   * 【Live2D 靈宵天尊 - 主角劍仙】
   * 包含：藍色劍氣陣芒 + 飛劍獨立環繞懸浮 + 仙袍帶動
   */
  private buildProtagonistLive2D(container: UnitSpriteContainer, unit: BattleUnit) {
    const baseDisk = this.add.graphics();
    baseDisk.fillStyle(0x3b82f6, 0.32);
    baseDisk.fillEllipse(0, 32, 54, 20);
    baseDisk.lineStyle(2, 0x60a5fa, 1);
    baseDisk.strokeEllipse(0, 32, 54, 20);

    const bodyG = this.add.graphics();
    bodyG.fillStyle(0x1e3a8a, 1);
    bodyG.fillTriangle(-20, 26, 20, 26, 0, -20);
    bodyG.lineStyle(2, 0x93c5fd, 1);
    bodyG.strokeTriangle(-20, 26, 20, 26, 0, -20);

    const headGroup = this.add.container(0, -35);
    const faceG = this.add.graphics();
    faceG.fillStyle(0x0f172a, 1);
    faceG.fillCircle(0, 0, 16);
    faceG.lineStyle(2, 0x60a5fa, 1);
    faceG.strokeCircle(0, 0, 16);

    // 束髮冠
    faceG.fillStyle(0xf59e0b, 1);
    faceG.fillTriangle(-6, -14, 6, -14, 0, -24);

    headGroup.add(faceG);

    // Live2D 獨立飛劍 (軌跡環繞懸浮)
    const swordGroup = this.add.container(24, -20);
    const swordG = this.add.graphics();
    swordG.fillStyle(0x93c5fd, 1);
    swordG.fillTriangle(0, -35, -5, 15, 5, 15);
    swordG.lineStyle(1.5, 0xffffff, 1);
    swordG.strokeTriangle(0, -35, -5, 15, 5, 15);

    swordGroup.add(swordG);

    this.tweens.add({
      targets: swordGroup,
      y: -28,
      rotation: 0.15,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.tweens.add({
      targets: [bodyG, headGroup],
      y: "-=3",
      duration: 1300,
      yoyo: true,
      repeat: -1,
    });

    const UIProps = this.buildUIProps(unit, false);
    container.add([baseDisk, bodyG, headGroup, swordGroup, ...UIProps]);
  }

  private buildUIProps(unit: BattleUnit, isAmbush: boolean): Phaser.GameObjects.GameObject[] {
    const isPlayer = unit.faction === "PLAYER";
    const hpBarW = 64;
    const hpBg = this.add.rectangle(0, -92, hpBarW, 6, 0x000000, 0.85);
    const hpFill = this.add.rectangle(
      -hpBarW / 2, -92,
      hpBarW * (unit.currentHp / unit.maxHp), 5,
      isPlayer ? 0x22c55e : 0xef4444, 1
    ).setOrigin(0, 0.5);
    hpFill.setName("unitHpFill");

    const nameText = this.add.text(0, 44, unit.heroConfig.name, {
      fontSize: "11px",
      color: isPlayer ? "#fef08a" : "#fca5a5",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3.5,
    }).setOrigin(0.5);

    const res: Phaser.GameObjects.GameObject[] = [hpBg, hpFill, nameText];

    if (isAmbush) {
      const ambushTag = this.add.text(0, -104, "🌿 伏擊中", {
        fontSize: "10px",
        color: "#6ee7b7",
        stroke: "#064e3b",
        strokeThickness: 3,
      }).setOrigin(0.5);
      res.push(ambushTag);
    }

    return res;
  }
}
