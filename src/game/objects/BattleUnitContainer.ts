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
  private hpText!: Phaser.GameObjects.Text;
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
   * 構建視覺元件（光環、角色立繪、血條、數值、姓名、狀態標籤）
   */
  private buildVisuals(unit: BattleUnit) {
    const isPlayer = unit.faction === "PLAYER";
    const heroId = unit.heroConfig.id;
    const isAmbush = (unit.x >= 2 && unit.y >= 4 && unit.y <= 8) || unit.statusEffects.includes("AMBUSH");

    // 1. 腳下動態陣法/光環底圖
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

    // 光環微旋轉/呼吸
    this.scene.tweens.add({
      targets: this.auraDisk,
      alpha: isAmbush ? 0.45 : 0.6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

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

    // 3. 血條、精確數值顯示與名稱
    const hpBarW = 72;
    const hpBg = this.scene.add.rectangle(0, -112, hpBarW, 8, 0x000000, 0.85);
    const hpRatio = Math.max(0, unit.currentHp / unit.maxHp);
    
    this.hpFill = this.scene.add.rectangle(
      -hpBarW / 2,
      -112,
      hpBarW * hpRatio,
      7,
      isPlayer ? 0x22c55e : 0xef4444,
      1
    ).setOrigin(0, 0.5);

    // 精確 HP 數字浮字 (如 120/120)
    this.hpText = this.scene.add.text(0, -112, `${unit.currentHp}/${unit.maxHp}`, {
      fontSize: "9px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.nameText = this.scene.add.text(0, 52, `${unit.heroConfig.name}`, {
      fontSize: "12px",
      color: isPlayer ? "#fef08a" : "#fca5a5",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3.5,
    }).setOrigin(0.5);

    this.add([this.auraDisk, this.charSprite, hpBg, this.hpFill, this.hpText, this.nameText]);

    if (isAmbush) {
      this.ambushTag = this.scene.add.text(0, -128, "🌿 半隱身 (伏擊)", {
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
   * 播放受擊/技能視覺特效（震動、閃白、傷害數字飄字）
   */
  public playHitEffect(damage: number, isCrit: boolean = false) {
    // 1. 受擊受損紅閃特效
    this.scene.tweens.add({
      targets: this.charSprite,
      tint: 0xff0000,
      duration: 100,
      yoyo: true,
      onComplete: () => this.charSprite.clearTint(),
    });

    // 2. 劇烈震動
    this.scene.tweens.add({
      targets: this,
      x: this.x + (Math.random() > 0.5 ? 10 : -10),
      duration: 40,
      yoyo: true,
      repeat: 3,
    });

    // 3. 飄字特效
    const floatText = this.scene.add.text(
      this.x,
      this.y - 80,
      isCrit ? `💥 暴擊 -${damage}` : `⚔️ -${damage}`,
      {
        fontSize: isCrit ? "22px" : "16px",
        color: isCrit ? "#f59e0b" : "#ef4444",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setDepth(310);

    this.scene.tweens.add({
      targets: floatText,
      y: this.y - 130,
      alpha: 0,
      duration: 1000,
      ease: "Back.out",
      onComplete: () => floatText.destroy(),
    });
  }

  /**
   * 根據狀態更新位置與血條數值
   */
  public updateState(unit: BattleUnit, screenWidth: number, screenHeight: number) {
    this.gridCol = unit.x;
    this.gridRow = unit.y;

    const { px, py, normY } = gridToScreen(unit.x, unit.y, screenWidth, screenHeight);
    this.baseScale = 0.7 + normY * 0.45;
    this.depth = Math.floor(py);

    // 血條與 HP 數字更新
    const hpBarW = 72;
    const hpRatio = Math.max(0, unit.currentHp / unit.maxHp);
    this.hpFill.setSize(hpBarW * hpRatio, 7);
    this.hpText.setText(`${unit.currentHp}/${unit.maxHp}`);

    // 名稱位置更新
    this.nameText.setText(`${unit.heroConfig.name}`);

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
        duration: 400,
        onComplete: () => this.setVisible(false),
      });
    } else {
      this.setVisible(true);
    }
  }

  public destroyContainer() {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.charSprite);
    this.scene.tweens.killTweensOf(this.auraDisk);
    this.destroy(true);
  }
}
