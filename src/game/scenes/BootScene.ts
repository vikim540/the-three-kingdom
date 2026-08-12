import * as Phaser from "phaser";
import { MAP_ROWS } from "../config/constants";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
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
    this.createTileTextures();
    this.scene.start("BattleScene");
  }

  private createTileTextures() {
    // 動態計算 tileSize 以填充視窗高度（留出底部 HUD 空間）
    const hudHeight = 140;
    const tileSize = Math.floor((this.scale.height - hudHeight) / MAP_ROWS);

    // 1. 普通山間小道（泥黃）
    const normalG = this.make.graphics({ x: 0, y: 0 });
    normalG.fillStyle(0x3d2b18, 0.88);
    normalG.fillRect(0, 0, tileSize, tileSize);
    normalG.lineStyle(1, 0x78350f, 0.5);
    normalG.strokeRect(0.5, 0.5, tileSize - 1, tileSize - 1);
    normalG.generateTexture("tile_normal", tileSize, tileSize);

    // 2. 密草叢（幽綠伏擊）
    const bushG = this.make.graphics({ x: 0, y: 0 });
    bushG.fillStyle(0x064e3b, 0.92);
    bushG.fillRect(0, 0, tileSize, tileSize);
    bushG.lineStyle(2, 0x10b981, 1);
    bushG.strokeRect(1, 1, tileSize - 2, tileSize - 2);
    bushG.fillStyle(0x34d399, 1);
    const cx = tileSize / 2;
    const cy = tileSize / 2;
    const r = tileSize * 0.16;
    bushG.fillCircle(cx - r * 1.2, cy, r * 1.1);
    bushG.fillCircle(cx + r * 1.2, cy, r * 1.1);
    bushG.fillCircle(cx, cy + r * 0.8, r * 1.3);
    bushG.generateTexture("tile_bush", tileSize, tileSize);

    // 3. 深山密林（不可通行區域）
    const forestG = this.make.graphics({ x: 0, y: 0 });
    forestG.fillStyle(0x022c22, 0.95);
    forestG.fillRect(0, 0, tileSize, tileSize);
    forestG.lineStyle(1, 0x065f46, 0.6);
    forestG.strokeRect(0.5, 0.5, tileSize - 1, tileSize - 1);
    forestG.fillStyle(0x047857, 1);
    const th = tileSize;
    forestG.fillTriangle(th * 0.15, th * 0.9, th * 0.5, th * 0.1, th * 0.85, th * 0.9);
    forestG.fillStyle(0x065f46, 1);
    forestG.fillTriangle(th * 0.1, th * 0.75, th * 0.5, th * 0.25, th * 0.9, th * 0.75);
    forestG.generateTexture("tile_forest", tileSize, tileSize);

    // 4. 黑石障礙
    const obsG = this.make.graphics({ x: 0, y: 0 });
    obsG.fillStyle(0x1c0a0a, 0.97);
    obsG.fillRect(0, 0, tileSize, tileSize);
    obsG.lineStyle(2, 0xb91c1c, 0.7);
    obsG.strokeRect(1, 1, tileSize - 2, tileSize - 2);
    obsG.fillStyle(0x7f1d1d, 1);
    obsG.fillTriangle(th * 0.2, th * 0.85, th * 0.5, th * 0.18, th * 0.8, th * 0.85);
    obsG.generateTexture("tile_obstacle", tileSize, tileSize);

    // 5. 逃生法陣（底部青藍符文圈）
    const escG = this.make.graphics({ x: 0, y: 0 });
    escG.fillStyle(0x0c2540, 0.95);
    escG.fillRect(0, 0, tileSize, tileSize);
    escG.lineStyle(3, 0x38bdf8, 1);
    escG.strokeRect(1, 1, tileSize - 2, tileSize - 2);
    escG.lineStyle(2, 0x7dd3fc, 0.8);
    escG.strokeCircle(tileSize / 2, tileSize / 2, tileSize * 0.32);
    escG.fillStyle(0x0ea5e9, 0.5);
    escG.fillCircle(tileSize / 2, tileSize / 2, tileSize * 0.16);
    // 存入 registry 供 BattleScene 讀取
    escG.generateTexture("tile_escape", tileSize, tileSize);

    // 把 tileSize 存到 registry 供 BattleScene 使用
    this.registry.set("tileSize", tileSize);
  }
}
