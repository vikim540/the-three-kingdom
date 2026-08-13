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
  private bushGraphics!: Phaser.GameObjects.Graphics;
  private tooltipText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    const sw = this.scale.width;
    const sh = this.scale.height;

    // 1. 山谷全螢幕背景
    this.addBackground();

    // 2. 右側古樹草叢美術資材
    this.drawBushOverlay(sw, sh);

    // 3. 氣若柔絲 局部飄霧
    this.addDriftingFogLayer();

    // 4. 多邊形邊界圖層
    this.regionGraphics = this.add.graphics();
    this.drawPolygonsOverlay();

    // 5. 提示浮層文字
    this.tooltipText = this.add.text(sw / 2, 30, "", {
      fontSize: "13px",
      color: "#fef08a",
      fontStyle: "bold",
      backgroundColor: "rgba(9, 9, 11, 0.85)",
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(200).setVisible(false);

    // 6. 訂閱 Store
    this.syncUnitsFromStore();

    useBattleStore.subscribe((state, prevState) => {
      this.updateUnitsVisual(state.units);

      // 當階段切換至 BATTLE_IN_PROGRESS，觸發戰術武將技演繹！
      if (state.phase === "BATTLE_IN_PROGRESS" && prevState.phase === "DEPLOYMENT") {
        this.executeTacticalCombatSequence(state.units);
      }
    });

    useDevStore.subscribe(() => {
      this.drawPolygonsOverlay();
    });

    this.scale.on("resize", () => {
      this.scene.restart();
    });
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
    this.bushGraphics = this.add.graphics();
    const bx = sw * 0.72;
    const by = sh * 0.45;

    this.bushGraphics.fillStyle(0x064e3b, 0.75);
    this.bushGraphics.fillEllipse(bx, by, 180, 90);

    this.bushGraphics.fillStyle(0x047857, 0.85);
    this.bushGraphics.fillEllipse(bx - 20, by - 10, 140, 70);
    this.bushGraphics.fillEllipse(bx + 30, by + 10, 130, 65);

    this.bushGraphics.fillStyle(0x10b981, 0.9);
    this.bushGraphics.fillEllipse(bx - 10, by - 20, 100, 50);
    this.bushGraphics.fillEllipse(bx + 15, by - 15, 90, 45);

    const bushLabel = this.add.text(bx, by - 45, "🌿 側翼古樹草叢 (黃忠神箭伏擊點)", {
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

  private updateUnitsVisual(units: BattleUnit[]) {
    const sw = this.scale.width;
    const sh = this.scale.height;

    units.forEach((unit) => {
      let container = this.unitContainers.get(unit.instanceId);

      if (unit.x < 0 || unit.y < 0) {
        if (container) container.setVisible(false);
        return;
      }

      const px = unit.x <= 1.0 ? unit.x * sw : unit.x;
      const py = unit.y <= 1.0 ? unit.y * sh : unit.y;
      const normY = py / sh;
      const perspectiveScale = getPerspectiveScale(normY);

      if (!container) {
        container = this.add.container(px, py) as UnitSpriteContainer;
        container.unitInstanceId = unit.instanceId;
        this.buildLive2DCharacter(container, unit, perspectiveScale);
        this.unitContainers.set(unit.instanceId, container);
      } else {
        this.buildLive2DCharacter(container, unit, perspectiveScale);
      }

      container.normX = px / sw;
      container.normY = normY;
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
   * 構建角色 (包含 Hover 懸停放大提示、手勢切換與光環暗示)
   */
  private buildLive2DCharacter(container: UnitSpriteContainer, unit: BattleUnit, baseScale: number) {
    container.removeAll(true);

    const isPlayer = unit.faction === "PLAYER";
    const heroId = unit.heroConfig.id;
    const isAmbush = unit.statusEffects.includes("AMBUSH");

    // 1. 光環底盤 (Hover 時發光提示)
    const auraColor = isPlayer
      ? heroId === "hero_huang_zhong"
        ? 0x10b981
        : heroId === "hero_xiahou_dun"
        ? 0xf59e0b
        : 0x3b82f6
      : 0xef4444;

    const baseDisk = this.add.graphics();
    baseDisk.setName("baseDisk");
    baseDisk.fillStyle(auraColor, isAmbush ? 0.65 : 0.35);
    baseDisk.fillEllipse(0, 36, 72, 28);
    baseDisk.lineStyle(2.5, auraColor, 1);
    baseDisk.strokeEllipse(0, 36, 72, 28);

    // 2. 高清透明底角色
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

    const nameText = this.add.text(0, 52, unit.heroConfig.name, {
      fontSize: "11px",
      color: isPlayer ? "#fef08a" : "#fca5a5",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3.5,
    }).setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [baseDisk, charSprite, hpBg, hpFill, nameText];

    if (isAmbush) {
      const ambushTag = this.add.text(0, -126, "🌿 半隱身 (百步穿楊伏擊)", {
        fontSize: "10px",
        color: "#6ee7b7",
        fontStyle: "bold",
        stroke: "#064e3b",
        strokeThickness: 3,
      }).setOrigin(0.5);
      children.push(ambushTag);
    }

    container.add(children);

    // 4. ⭐ Hover 懸停放大提示與手勢切換 (寓意暗示用戶可拖拽)
    container.setInteractive(
      new Phaser.Geom.Rectangle(-50, -110, 100, 160),
      Phaser.Geom.Rectangle.Contains
    );

    container.on("pointerover", () => {
      if (isPlayer) {
        this.input.setDefaultCursor("grab");
        if (this.tooltipText) {
          this.tooltipText
            .setText(`🖱️ [${unit.heroConfig.name}] 按住可拖拽調整戰術站位`)
            .setVisible(true);
        }
      } else {
        this.input.setDefaultCursor("pointer");
        if (this.tooltipText) {
          this.tooltipText
            .setText(`⚔️ [${unit.heroConfig.name}] HP:${unit.currentHp}/${unit.maxHp} ATK:${unit.atk}`)
            .setVisible(true);
        }
      }

      // ⭐ 懸停放大 1.18 倍，並閃爍黃金邊框暗示可互動
      this.tweens.add({
        targets: container,
        scaleX: baseScale * 1.18,
        scaleY: baseScale * 1.18,
        duration: 150,
        ease: "Power2.out",
      });

      // 增強底光
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
        duration: 150,
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
  }

  /**
   * 執行非線性戰術武將技演繹 (黃忠伏擊 / 夏侯惇援護)
   */
  private executeTacticalCombatSequence(units: BattleUnit[]) {
    const huangZhong = units.find((u) => u.heroConfig.id === "hero_huang_zhong" && u.x >= 0);
    const xiahouDun = units.find((u) => u.heroConfig.id === "hero_xiahou_dun" && u.x >= 0);
    const banditChief = units.find((u) => u.heroConfig.id === "enemy_bandit_chief" && !u.isDead);

    // 路線 A：黃忠草叢伏擊一擊必殺
    const isHuangAmbush = huangZhong?.statusEffects.includes("AMBUSH") || (huangZhong && huangZhong.x >= 0.60);

    if (huangZhong && banditChief && isHuangAmbush) {
      const hzContainer = this.unitContainers.get(huangZhong.instanceId);
      const chiefContainer = this.unitContainers.get(banditChief.instanceId);

      if (hzContainer && chiefContainer) {
        hzContainer.setAlpha(1);

        const skillBanner = this.add.text(hzContainer.x, hzContainer.y - 140, "🏹【百步穿楊 · 一擊必殺！】", {
          fontSize: "20px",
          color: "#fef08a",
          fontStyle: "bold",
          stroke: "#b45309",
          strokeThickness: 5,
        }).setOrigin(0.5);

        this.tweens.add({
          targets: skillBanner,
          y: hzContainer.y - 180,
          scale: 1.2,
          duration: 600,
          yoyo: true,
        });

        const arrow = this.add.graphics();
        arrow.lineStyle(4, 0xf59e0b, 1);
        arrow.lineBetween(hzContainer.x, hzContainer.y - 40, chiefContainer.x, chiefContainer.y - 40);

        this.tweens.add({
          targets: arrow,
          alpha: 0,
          duration: 800,
          onComplete: () => arrow.destroy(),
        });

        this.time.delayedCall(500, () => {
          const critText = this.add.text(chiefContainer.x, chiefContainer.y - 100, "⚡ 9999 一擊必殺！", {
            fontSize: "24px",
            color: "#ef4444",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 6,
          }).setOrigin(0.5);

          this.tweens.add({
            targets: critText,
            y: chiefContainer.y - 150,
            alpha: 0,
            duration: 1200,
          });

          useBattleStore.getState().setUnits(
            useBattleStore.getState().units.map((u) =>
              u.instanceId === banditChief.instanceId ? { ...u, currentHp: 0, isDead: true } : u
            )
          );

          useBattleStore.getState().addCombatLog("🏹 老將黃忠於草叢施展【百步穿楊】，一箭貫穿山賊首領【獨眼寨主】！", "skill");

          // 敵眾慌動潰逃
          this.time.delayedCall(800, () => {
            units.forEach((u) => {
              if (u.faction === "ENEMY" && u.instanceId !== banditChief.instanceId) {
                const enemyContainer = this.unitContainers.get(u.instanceId);
                if (enemyContainer) {
                  const panicMsg = this.add.text(enemyContainer.x, enemyContainer.y - 80, "😱 大寨主死啦！快逃啊！", {
                    fontSize: "12px",
                    color: "#fca5a5",
                    fontStyle: "bold",
                    stroke: "#7f1d1d",
                    strokeThickness: 3,
                  }).setOrigin(0.5);

                  this.tweens.add({
                    targets: [enemyContainer, panicMsg],
                    x: enemyContainer.x + 400,
                    alpha: 0,
                    duration: 1200,
                    ease: "Power2.in",
                  });
                }
              }
            });

            useBattleStore.getState().addCombatLog("😱 敵眾見大寨主被秒殺，精神潰散，拋頭鼠竄逃離戰場！", "victory");

            this.time.delayedCall(1600, () => {
              useBattleStore.getState().setPhase("VICTORY");
            });
          });
        });
        return;
      }
    }

    // 路線 B：夏侯惇正面鐵血援護防禦推進
    if (xiahouDun && banditChief) {
      useBattleStore.getState().addCombatLog("🛡️ 夏侯惇發動【鐵血援護】，獲得 40% 傷害豁免並率全隊反擊！", "skill");
      this.time.delayedCall(1200, () => {
        useBattleStore.getState().setUnits(
          useBattleStore.getState().units.map((u) =>
            u.faction === "ENEMY" ? { ...u, currentHp: 0, isDead: true } : u
          )
        );
        useBattleStore.getState().setPhase("VICTORY");
      });
    }
  }
}
