import * as Phaser from "phaser";
import { TILE_SIZE, MAP_COLS, MAP_ROWS } from "../config/constants";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // 預載入 16:9 高清修仙密林山道戰場背景與 2D 人物圖案
    this.load.image("forest_path_bg", "/assets/terrain/forest_path_bg.webp");
    this.load.image("battle_bg", "/assets/terrain/battle_bg.webp");
    this.load.image("hero_protagonist", "/assets/heroes/protagonist.webp");
    this.load.image("hero_huang_zhong", "/assets/heroes/huang_zhong.webp");
    this.load.image("hero_xiahou_dun", "/assets/heroes/xiahou_dun.webp");
    this.load.image("hero_zhao_yun", "/assets/heroes/zhao_yun.webp");
    this.load.image("hero_guo_jia", "/assets/heroes/guo_jia.webp");
    this.load.image("enemy_bandit_chief", "/assets/heroes/bandit_chief.webp");
    this.load.image("enemy_bandit_thug", "/assets/heroes/bandit_thug.webp");
  }

  create() {
    this.createTextureGraphics();
    this.scene.start("BattleScene");
  }

  private createTextureGraphics() {
    const canvasW = MAP_COLS * TILE_SIZE; // 288px
    const canvasH = MAP_ROWS * TILE_SIZE; // 720px

    // 0. 備用山道水墨牆面圖案
    const bgG = this.make.graphics({ x: 0, y: 0 });
    bgG.fillGradientStyle(0x064e3b, 0x0284c7, 0x0f172a, 0x1e1b4b, 1);
    bgG.fillRect(0, 0, canvasW, canvasH);
    bgG.generateTexture("fallback_bg", canvasW, canvasH);

    // 1. 普通山間小道 (泥黃色古徑)
    const normalG = this.make.graphics({ x: 0, y: 0 });
    normalG.fillStyle(0x3f2e21, 0.9);
    normalG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    normalG.lineStyle(2, 0x78350f, 0.7);
    normalG.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    normalG.generateTexture("tile_normal", TILE_SIZE, TILE_SIZE);

    // 2. 密草叢圖案 (幽綠秘草・伏擊專用)
    const bushG = this.make.graphics({ x: 0, y: 0 });
    bushG.fillStyle(0x065f46, 0.95);
    bushG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    bushG.lineStyle(2, 0x10b981, 1);
    bushG.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    bushG.fillStyle(0x34d399, 1);
    bushG.fillCircle(TILE_SIZE * 0.3, TILE_SIZE * 0.35, 12);
    bushG.fillCircle(TILE_SIZE * 0.7, TILE_SIZE * 0.35, 12);
    bushG.fillCircle(TILE_SIZE * 0.5, TILE_SIZE * 0.65, 16);
    bushG.generateTexture("tile_bush", TILE_SIZE, TILE_SIZE);

    // 3. 深山密林圖案 (濃密綠樹林)
    const forestG = this.make.graphics({ x: 0, y: 0 });
    forestG.fillStyle(0x022c22, 0.95);
    forestG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    forestG.lineStyle(2, 0x059669, 0.8);
    forestG.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    forestG.fillStyle(0x047857, 1);
    forestG.fillTriangle(
      TILE_SIZE * 0.2, TILE_SIZE * 0.85,
      TILE_SIZE * 0.5, TILE_SIZE * 0.15,
      TILE_SIZE * 0.8, TILE_SIZE * 0.85
    );
    forestG.generateTexture("tile_forest", TILE_SIZE, TILE_SIZE);

    // 4. 崎嶇黑石障礙 (魔石)
    const obsG = this.make.graphics({ x: 0, y: 0 });
    obsG.fillStyle(0x450a0a, 0.95);
    obsG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    obsG.lineStyle(2, 0xef4444, 1);
    obsG.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    obsG.fillStyle(0xd97706, 1);
    obsG.fillTriangle(
      TILE_SIZE * 0.2, TILE_SIZE * 0.8,
      TILE_SIZE * 0.5, TILE_SIZE * 0.2,
      TILE_SIZE * 0.8, TILE_SIZE * 0.8
    );
    obsG.generateTexture("tile_obstacle", TILE_SIZE, TILE_SIZE);

    // 5. 底部逃生法陣圖案 (炫彩青藍符文陣)
    const escapeG = this.make.graphics({ x: 0, y: 0 });
    escapeG.fillStyle(0x082f49, 0.95);
    escapeG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    escapeG.lineStyle(3, 0x38bdf8, 1);
    escapeG.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    escapeG.lineStyle(2, 0x7dd3fc, 0.9);
    escapeG.strokeCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE * 0.35);
    escapeG.fillStyle(0x0284c7, 0.8);
    escapeG.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE * 0.2);
    escapeG.generateTexture("tile_escape", TILE_SIZE, TILE_SIZE);
  }
}
