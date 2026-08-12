import * as Phaser from "phaser";
import { TILE_SIZE, MAP_SIZE } from "../config/constants";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // 預載入 2D 高清背景與人物美術圖案
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
    const canvasSize = MAP_SIZE * TILE_SIZE; // 512px

    // 0. 玄幻戰場山水背景備用圖案 (備用向量藝術)
    const bgG = this.make.graphics({ x: 0, y: 0 });
    bgG.fillGradientStyle(0x0f172a, 0x1e1b4b, 0x064e3b, 0x0284c7, 1);
    bgG.fillRect(0, 0, canvasSize, canvasSize);
    bgG.lineStyle(1, 0x38bdf8, 0.2);
    for (let i = 0; i < canvasSize; i += 32) {
      bgG.lineBetween(i, 0, i, canvasSize);
      bgG.lineBetween(0, i, canvasSize, i);
    }
    bgG.generateTexture("fallback_bg", canvasSize, canvasSize);

    // 1. 普通平地圖案 (青石古陣紋理)
    const normalG = this.make.graphics({ x: 0, y: 0 });
    normalG.fillStyle(0x1e293b, 0.95);
    normalG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    normalG.lineStyle(2, 0x475569, 0.8);
    normalG.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    // 陣法金邊
    normalG.lineStyle(1, 0xca8a04, 0.4);
    normalG.strokeRect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8);
    normalG.generateTexture("tile_normal", TILE_SIZE, TILE_SIZE);

    // 2. 密草叢圖案 (幽綠秘草・伏擊專用)
    const bushG = this.make.graphics({ x: 0, y: 0 });
    bushG.fillStyle(0x065f46, 0.95);
    bushG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    bushG.lineStyle(2, 0x10b981, 1);
    bushG.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    // 仙草葉細節
    bushG.fillStyle(0x34d399, 1);
    bushG.fillCircle(TILE_SIZE * 0.3, TILE_SIZE * 0.35, 10);
    bushG.fillCircle(TILE_SIZE * 0.7, TILE_SIZE * 0.35, 10);
    bushG.fillCircle(TILE_SIZE * 0.5, TILE_SIZE * 0.65, 14);
    bushG.generateTexture("tile_bush", TILE_SIZE, TILE_SIZE);

    // 3. 崎嶇岩石圖案 (魔熔岩石・障礙區)
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
  }
}
