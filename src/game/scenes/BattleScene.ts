import * as Phaser from "phaser";
import { useBattleStore } from "@/stores/useBattleStore";
import { useDevStore } from "@/stores/useDevStore";
import { BattleUnit } from "@/types/game";
import { getPerspectiveScale, REGION_COLORS } from "@/types/region";

interface UnitCardContainer extends Phaser.GameObjects.Container {
  unitInstanceId?: string;
  normX?: number;
  normY?: number;
}

export class BattleScene extends Phaser.Scene {
  private unitContainers: Map<string, UnitCardContainer> = new Map();
  private regionGraphics!: Phaser.GameObjects.Graphics;
  private activeRadialUnitId: string | null = null;

  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    // 1. 全螢幕山谷背景圖
    this.addBackground();

    // 2. 多邊形區域繪製圖層 (僅在開發者模式下顯示)
    this.regionGraphics = this.add.graphics();
    this.drawPolygonsOverlay();

    // 3. 訂閱 Zustand Store
    this.syncUnitsFromStore();

    useBattleStore.subscribe((state) => {
      this.updateUnitsVisual(state.units);
    });

    useDevStore.subscribe(() => {
      this.drawPolygonsOverlay();
    });

    // 4. 螢幕 resize 時重新整頓
    this.scale.on("resize", () => {
      this.scene.restart();
    });
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

      this.regionGraphics.lineStyle(2, colorHex, 0.9);
      this.regionGraphics.fillStyle(colorHex, 0.25);

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
   * 建立與更新「實體卡牌」名將單位 Container
   */
  private updateUnitsVisual(units: BattleUnit[]) {
    const sw = this.scale.width;
    const sh = this.scale.height;

    units.forEach((unit) => {
      let container = this.unitContainers.get(unit.instanceId);

      // 歸一化座標 (0 ~ 1) 轉成畫面像素 座標 (px, py)
      const px = unit.x <= 1.0 ? unit.x * sw : unit.x;
      const py = unit.y <= 1.0 ? unit.y * sh : unit.y;

      const normY = py / sh;
      const perspectiveScale = getPerspectiveScale(normY);

      if (!container) {
        container = this.add.container(px, py) as UnitCardContainer;
        container.unitInstanceId = unit.instanceId;

        // 構建精美卡牌 UI
        this.buildHeroCard(container, unit);
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

      // 更新卡片血條
      const hpFill = container.getByName("cardHpFill") as Phaser.GameObjects.Rectangle;
      if (hpFill) {
        const fullW = (container.getData("cardWidth") as number) * 0.82;
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
   * 創建三國修仙名將「卡牌」UI Container
   */
  private buildHeroCard(container: UnitCardContainer, unit: BattleUnit) {
    container.removeAll(true);

    const isPlayer = unit.faction === "PLAYER";
    const quality = unit.heroConfig.quality || "靈";

    const cardW = isPlayer ? 96 : 82;
    const cardH = isPlayer ? 128 : 110;
    container.setData("cardWidth", cardW);
    container.setData("cardHeight", cardH);

    const qualityColors: Record<string, number> = {
      仙: 0xf59e0b,
      帝: 0xa855f7,
      王: 0x3b82f6,
      靈: 0x10b981,
      凡: 0x64748b,
    };
    const borderColor = isPlayer ? (qualityColors[quality] || 0x10b981) : 0xb91c1c;

    // 1. 卡牌底框與發光
    const cardGlow = this.add.graphics();
    cardGlow.fillStyle(borderColor, 0.25);
    cardGlow.fillRoundedRect(-cardW / 2 - 3, -cardH / 2 - 3, cardW + 6, cardH + 6, 8);

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x09090b, 0.95);
    cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
    cardBg.lineStyle(isPlayer ? 2.5 : 2, borderColor, 1);
    cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);

    // 2. 立繪圖片
    let texKey = "hero_protagonist";
    const id = unit.heroConfig.id;
    if (id === "hero_huang_zhong") texKey = "hero_huang_zhong";
    else if (id === "hero_xiahou_dun") texKey = "hero_xiahou_dun";
    else if (id === "hero_zhao_yun") texKey = "hero_zhao_yun";
    else if (id === "hero_guo_jia") texKey = "hero_guo_jia";
    else if (id === "enemy_bandit_chief") texKey = "enemy_bandit_chief";
    else if (id === "enemy_bandit_thug") texKey = "enemy_bandit_thug";

    const portrait = this.add.image(0, -6, texKey);
    portrait.setDisplaySize(cardW - 8, cardH - 36);

    // 3. 頂部陣營條
    const factionBar = this.add.graphics();
    const factionColor = unit.heroConfig.faction === "蜀" ? 0x15803d :
      unit.heroConfig.faction === "魏" ? 0x1d4ed8 : 0x78350f;
    factionBar.fillStyle(factionColor, 0.9);
    factionBar.fillRoundedRect(-cardW / 2 + 2, -cardH / 2 + 2, cardW - 4, 16, { tl: 5, tr: 5, bl: 0, br: 0 });

    const factionText = this.add.text(0, -cardH / 2 + 10, `${unit.heroConfig.faction} • ${quality}階`, {
      fontSize: "10px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    // 4. 底部名字牌
    const nameBg = this.add.graphics();
    nameBg.fillStyle(0x0f172a, 0.95);
    nameBg.fillRoundedRect(-cardW / 2 + 2, cardH / 2 - 24, cardW - 4, 22, { tl: 0, tr: 0, bl: 5, br: 5 });
    nameBg.lineStyle(1, borderColor, 0.7);
    nameBg.strokeRoundedRect(-cardW / 2 + 2, cardH / 2 - 24, cardW - 4, 22, { tl: 0, tr: 0, bl: 5, br: 5 });

    const nameText = this.add.text(0, cardH / 2 - 13, unit.heroConfig.name, {
      fontSize: "12px",
      color: isPlayer ? "#fef08a" : "#fca5a5",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);

    // 5. 血條
    const hpBarW = cardW * 0.82;
    const hpBg = this.add.rectangle(0, -cardH / 2 - 7, hpBarW, 6, 0x000000, 0.85);
    const hpFill = this.add.rectangle(
      -hpBarW / 2, -cardH / 2 - 7,
      hpBarW * (unit.currentHp / unit.maxHp), 5,
      isPlayer ? 0x22c55e : 0xef4444, 1
    ).setOrigin(0, 0.5);
    hpFill.setName("cardHpFill");

    container.add([cardGlow, cardBg, portrait, factionBar, factionText, nameBg, nameText, hpBg, hpFill]);

    container.setInteractive(
      new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
      Phaser.Geom.Rectangle.Contains
    );

    // 點擊觸發選擇與指令輪盤
    container.on("pointerdown", () => {
      if (unit.faction === "PLAYER") {
        useBattleStore.getState().setSelectedUnitId(unit.instanceId);
      }
    });

    // 懸停動畫
    container.on("pointerover", () => {
      this.tweens.add({
        targets: container,
        scaleX: container.scaleX * 1.1,
        scaleY: container.scaleY * 1.1,
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
