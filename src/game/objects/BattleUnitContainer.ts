import * as Phaser from "phaser";
import { BattleUnit } from "@/types/game";
import { gridToScreen } from "@/game/utils/gridCoords";

export class BattleUnitContainer extends Phaser.GameObjects.Container {
  public unitInstanceId: string;
  public gridCol: number;
  public gridRow: number;
  private baseScale: number = 1.0;
  private charSprite!: Phaser.GameObjects.Image;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;
  private auraDisk!: Phaser.GameObjects.Graphics;
  private ambushTag?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, unit: BattleUnit, screenWidth: number, screenHeight: number) {
    const { px, py, normY } = gridToScreen(unit.x, unit.y, screenWidth, screenHeight);
    super(scene, px, py);

    this.unitInstanceId = unit.instanceId;
    this.gridCol = unit.x;
    this.gridRow = unit.y;
    this.baseScale = 0.7 + normY * 0.45;

    this.setScale(this.baseScale);
    this.depth = Math.floor(py);

    this.buildVisuals(unit);
    scene.add.existing(this);
  }

  /**
   * 構建視覺元件（光環、角色立繪、血條、姓名、狀態標籤）
   */
  private buildVisuals(unit: BattleUnit) {
    const isPlayer = unit.faction === "PLAYER";
    const heroId = unit.heroConfig.id;
    const isAmbush = (unit.x >= 2 && unit.y >= 4 && unit.y <= 8) || unit.statusEffects.includes("AMBUSH");

    // 1. 光環底圖
    const auraColor = isPlayer
      ? heroId === "hero_huang_zhong"
        ? 0x10b981
        : heroId === "hero_xiahou_dun"
        ? 0xf59e0b
        : 0x3b82f6
      : 0xef4444;

    this.auraDisk = this.scene.add.graphics();
    this.auraDisk.fillStyle(auraColor, isAmbush ? 0.65 : 0.35);
    this.auraDisk.fillEllipse(0, 36, 72, 28);
    this.auraDisk.lineStyle(2.5, auraColor, 1);
    this.auraDisk.strokeEllipse(0, 36, 72, 28);

    // 2. 高清透明底角色立繪
    let live2dKey = "live2d_protagonist";
    if (heroId === "hero_huang_zhong") live2dKey = "live2d_huang_zhong";
    else if (heroId === "enemy_bandit_chief") live2dKey = "live2d_bandit_chief";
    else if (heroId === "enemy_bandit_thug") live2dKey = "live2d_bandit_thug";

    this.charSprite = this.scene.add.image(0, -32, live2dKey);
    this.charSprite.setDisplaySize(120, 150);

    if (isAmbush && heroId === "hero_huang_zhong") {
      this.setAlpha(0.62);
    } else {
      this.setAlpha(1.0);
    }

    // Live2D 骨骼呼吸效果
    this.scene.tweens.add({
      targets: this.charSprite,
      y: -36,
      scaleY: this.charSprite.scaleY * 1.04,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 3. 血條與名稱
    const hpBarW = 64;
    const hpBg = this.scene.add.rectangle(0, -112, hpBarW, 6, 0x000000, 0.85);
    this.hpFill = this.scene.add.rectangle(
      -hpBarW / 2,
      -112,
      hpBarW * Math.max(0, unit.currentHp / unit.maxHp),
      5,
      isPlayer ? 0x22c55e : 0xef4444,
      1
    ).setOrigin(0, 0.5);

    this.nameText = this.scene.add.text(0, 52, `${unit.heroConfig.name} (${unit.x},${unit.y})`, {
      fontSize: "11px",
      color: isPlayer ? "#fef08a" : "#fca5a5",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3.5,
    }).setOrigin(0.5);

    this.add([this.auraDisk, this.charSprite, hpBg, this.hpFill, this.nameText]);

    if (isAmbush) {
      this.ambushTag = this.scene.add.text(0, -126, "🌿 半隱身 (神箭伏擊)", {
        fontSize: "10px",
        color: "#6ee7b7",
        fontStyle: "bold",
        stroke: "#064e3b",
        strokeThickness: 3,
      }).setOrigin(0.5);
      this.add(this.ambushTag);
    }

    // 互動點擊區域
    this.setInteractive(
      new Phaser.Geom.Rectangle(-50, -110, 100, 160),
      Phaser.Geom.Rectangle.Contains
    );
  }

  /**
   * 根據狀態更新位置與動畫
   */
  public updateState(unit: BattleUnit, screenWidth: number, screenHeight: number) {
    this.gridCol = unit.x;
    this.gridRow = unit.y;

    const { px, py, normY } = gridToScreen(unit.x, unit.y, screenWidth, screenHeight);
    this.baseScale = 0.7 + normY * 0.45;
    this.depth = Math.floor(py);

    // 血條更新
    const hpBarW = 64;
    const hpRatio = Math.max(0, unit.currentHp / unit.maxHp);
    this.hpFill.setSize(hpBarW * hpRatio, 5);

    // 名稱位置更新
    this.nameText.setText(`${unit.heroConfig.name} (${unit.x},${unit.y})`);

    // 平滑位移動畫
    this.scene.tweens.add({
      targets: this,
      x: px,
      y: py,
      scaleX: this.baseScale,
      scaleY: this.baseScale,
      duration: 220,
      ease: "Power2",
    });

    if (unit.isDead) {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 350,
        onComplete: () => this.setVisible(false),
      });
    } else {
      this.setVisible(true);
    }
  }

  public destroyContainer() {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.charSprite);
    this.destroy(true);
  }
}
