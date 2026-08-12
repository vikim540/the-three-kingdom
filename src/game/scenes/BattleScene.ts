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

    // 2. 飄動環境雲霧層 (動態雨霧飄動感覺)
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
    // 動態山林雨霧飄動動畫 (橫向與微縱向飄動)
    if (this.fogTileSprite) {
      this.fogTileSprite.tilePositionX += (delta * 0.02);
      this.fogTileSprite.tilePositionY += (delta * 0.005);
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
   * 添加動態山林雲霧層
   */
  private addDriftingFogLayer() {
    const w = this.scale.width;
    const h = this.scale.height;

    if (this.textures.exists("fog_layer")) {
      this.fogTileSprite = this.add.tileSprite(w / 2, h / 2, w, h, "fog_layer");
      this.fogTileSprite.setAlpha(0.35);
      this.fogTileSprite.setBlendMode(Phaser.BlendModes.SCREEN);

      // 雲霧透明度呼吸動態
      this.tweens.add({
        targets: this.fogTileSprite,
        alpha: 0.52,
        duration: 4000,
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
   * 建立與更新「2D 描邊透明角色」單位 Container (徹底移除矩形卡牌)
   */
  private updateUnitsVisual(units: BattleUnit[]) {
    const sw = this.scale.width;
    const sh = this.scale.height;

    units.forEach((unit) => {
      let container = this.unitContainers.get(unit.instanceId);

      // 歸一化座標 (0 ~ 1) 轉成畫面像素座標 (px, py)
      const px = unit.x <= 1.0 ? unit.x * sw : unit.x;
      const py = unit.y <= 1.0 ? unit.y * sh : unit.y;

      const normY = py / sh;
      const perspectiveScale = getPerspectiveScale(normY);

      if (!container) {
        container = this.add.container(px, py) as UnitSpriteContainer;
        container.unitInstanceId = unit.instanceId;

        // 構建 2D 描邊角色 UI
        this.build2DCharacterSprite(container, unit);
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
   * 創建 2D 描邊光圈透明底角色 (無卡牌框)
   */
  private build2DCharacterSprite(container: UnitSpriteContainer, unit: BattleUnit) {
    container.removeAll(true);

    const isPlayer = unit.faction === "PLAYER";
    const quality = unit.heroConfig.quality || "靈";
    const radius = 34;

    const qualityGlowColors: Record<string, number> = {
      仙: 0xf59e0b,
      帝: 0xa855f7,
      王: 0x3b82f6,
      靈: 0x10b981,
      凡: 0x64748b,
    };
    const borderColor = isPlayer ? (qualityGlowColors[quality] || 0x10b981) : 0xef4444;

    // 1. 2D 腳下發光橢圓底盤
    const baseDisk = this.add.graphics();
    baseDisk.fillStyle(borderColor, 0.28);
    baseDisk.fillEllipse(0, radius - 4, radius * 1.5, radius * 0.65);
    baseDisk.lineStyle(2, borderColor, 0.95);
    baseDisk.strokeEllipse(0, radius - 4, radius * 1.5, radius * 0.65);

    // 2. 2D 描邊角色頭像/立繪 Sprite
    let texKey = "hero_protagonist";
    const id = unit.heroConfig.id;
    if (id === "hero_huang_zhong") texKey = "hero_huang_zhong";
    else if (id === "hero_xiahou_dun") texKey = "hero_xiahou_dun";
    else if (id === "hero_zhao_yun") texKey = "hero_zhao_yun";
    else if (id === "hero_guo_jia") texKey = "hero_guo_jia";
    else if (id === "enemy_bandit_chief") texKey = "enemy_bandit_chief";
    else if (id === "enemy_bandit_thug") texKey = "enemy_bandit_thug";

    // 2D 圓形描邊金/紅圈頭像 Sprite
    const charCircleBg = this.add.circle(0, -6, radius, 0x09090b, 0.95);
    charCircleBg.setStrokeStyle(2.5, borderColor, 1);

    const charSprite = this.add.image(0, -6, texKey);
    charSprite.setDisplaySize(radius * 1.85, radius * 1.85);

    // 圓形裁切遮罩
    const maskG = this.add.graphics();
    maskG.fillStyle(0xffffff);
    maskG.fillCircle(container.x, container.y - 6, radius - 2);
    charSprite.setMask(new Phaser.Display.Masks.GeometryMask(this, maskG));

    // 3. 頂部血條
    const hpBarW = 64;
    const hpBg = this.add.rectangle(0, -radius - 14, hpBarW, 6, 0x000000, 0.85);
    const hpFill = this.add.rectangle(
      -hpBarW / 2, -radius - 14,
      hpBarW * (unit.currentHp / unit.maxHp), 5,
      isPlayer ? 0x22c55e : 0xef4444, 1
    ).setOrigin(0, 0.5);
    hpFill.setName("unitHpFill");

    // 4. 腳下名字與職位標籤
    const nameText = this.add.text(0, radius + 12, unit.heroConfig.name, {
      fontSize: "11px",
      color: isPlayer ? "#fef08a" : "#fca5a5",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3.5,
    }).setOrigin(0.5);

    // 伏擊標籤
    const isAmbush = unit.statusEffects.includes("AMBUSH");
    let ambushTag: Phaser.GameObjects.Text | null = null;
    if (isAmbush) {
      ambushTag = this.add.text(0, -radius - 26, "🌿 伏擊中", {
        fontSize: "10px",
        color: "#6ee7b7",
        stroke: "#064e3b",
        strokeThickness: 3,
      }).setOrigin(0.5);
    }

    // 組合 Container
    const children = [baseDisk, charCircleBg, charSprite, hpBg, hpFill, nameText];
    if (ambushTag) children.push(ambushTag);
    container.add(children);

    // 呼吸浮動 Tween 動畫 (自然微上下飄動)
    this.tweens.add({
      targets: charSprite,
      y: -9,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    container.setInteractive(
      new Phaser.Geom.Circle(0, -6, radius),
      Phaser.Geom.Circle.Contains
    );

    container.on("pointerdown", () => {
      if (unit.faction === "PLAYER") {
        useBattleStore.getState().setSelectedUnitId(unit.instanceId);
      }
    });

    // 懸停放大
    container.on("pointerover", () => {
      this.tweens.add({
        targets: container,
        scaleX: container.scaleX * 1.12,
        scaleY: container.scaleY * 1.12,
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
  }
}
