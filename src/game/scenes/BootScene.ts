import * as Phaser from "phaser";
import { TILE_SIZE } from "../config/constants";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // 載入 2D 高清背景與人物美術圖案
    this.load.image("battle_bg", "/assets/terrain/battle_bg.webp");
    this.load.image("hero_protagonist", "/assets/heroes/protagonist.webp");
    this.load.image("hero_huang_zhong", "/assets/heroes/huang_zhong.webp");
    this.load.image("hero_xiahou_dun", "/assets/heroes/xiahou_dun.webp");
    this.load.image("hero_zhao_yun", "/assets/heroes/zhao_yun.webp");
    this.load.image("hero_guo_jia", "/assets/heroes/guo_jia.webp");
    this.load.image("enemy_bandit_chief", "/assets/heroes/bandit_chief.webp");
    this.load.image("enemy_bandit_thug", "/assets/heroes/bandit_thug.webp");

    // 建立向量地形格子圖案
    this.createTextureGraphics();
  }

  create() {
    this.scene.start("BattleScene");
  }

  private createTextureGraphics() {
    // 1. 普通平地圖案 (半透明古石砌紋理)
    const normalG = this.make.graphics({ x: 0, y: 0 });
    normalG.fillStyle(0x1e293b, 0.65);
    normalG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    normalG.lineStyle(1, 0x475569, 0.6);
    normalG.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    normalG.generateTexture("tile_normal", TILE_SIZE, TILE_SIZE);

    // 2. 密草叢圖案 (幽綠秘草)
    const bushG = this.make.graphics({ x: 0, y: 0 });
    bushG.fillStyle(0x064e3b, 0.75);
    bushG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    bushG.lineStyle(2, 0x10b981, 0.9);
    bushG.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    // 草葉細節
    bushG.fillStyle(0x059669, 0.9);
    bushG.fillCircle(TILE_SIZE * 0.3, TILE_SIZE * 0.4, 10);
    bushG.fillCircle(TILE_SIZE * 0.7, TILE_SIZE * 0.4, 10);
    bushG.fillCircle(TILE_SIZE * 0.5, TILE_SIZE * 0.6, 12);
    bushG.generateTexture("tile_bush", TILE_SIZE, TILE_SIZE);

    // 3. 崎嶇岩石圖案 (黑石陣)
    const obsG = this.make.graphics({ x: 0, y: 0 });
    obsG.fillStyle(0x0f172a, 0.85);
    obsG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    obsG.lineStyle(2, 0xef4444, 0.7);
    obsG.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    obsG.fillStyle(0x334155, 1);
    obsG.fillTriangle(
      TILE_SIZE * 0.2, TILE_SIZE * 0.8,
      TILE_SIZE * 0.5, TILE_SIZE * 0.2,
      TILE_SIZE * 0.8, TILE_SIZE * 0.8
    );
    obsG.generateTexture("tile_obstacle", TILE_SIZE, TILE_SIZE);
  }
}
