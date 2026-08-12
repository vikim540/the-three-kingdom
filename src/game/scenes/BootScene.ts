import * as Phaser from "phaser";
import { TILE_SIZE } from "../config/constants";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // 建立畫布與圖案 (Vector graphics rendering)
    this.createTextureGraphics();
  }

  create() {
    this.scene.start("BattleScene");
  }

  private createTextureGraphics() {
    // 1. 普通平地圖案
    const normalG = this.make.graphics({ x: 0, y: 0 });
    normalG.fillStyle(0x1e293b, 1);
    normalG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    normalG.lineStyle(1, 0x334155, 0.6);
    normalG.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    normalG.generateTexture("tile_normal", TILE_SIZE, TILE_SIZE);

    // 2. 密草叢圖案
    const bushG = this.make.graphics({ x: 0, y: 0 });
    bushG.fillStyle(0x064e3b, 1);
    bushG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    bushG.lineStyle(2, 0x10b981, 0.8);
    bushG.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    // 草葉形狀
    bushG.fillStyle(0x059669, 1);
    bushG.fillCircle(TILE_SIZE * 0.3, TILE_SIZE * 0.4, 10);
    bushG.fillCircle(TILE_SIZE * 0.7, TILE_SIZE * 0.4, 10);
    bushG.fillCircle(TILE_SIZE * 0.5, TILE_SIZE * 0.6, 12);
    bushG.generateTexture("tile_bush", TILE_SIZE, TILE_SIZE);

    // 3. 崎嶇岩石圖案
    const obsG = this.make.graphics({ x: 0, y: 0 });
    obsG.fillStyle(0x0f172a, 1);
    obsG.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    obsG.lineStyle(2, 0x475569, 0.8);
    obsG.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    // 岩石圖樣
    obsG.fillStyle(0x334155, 1);
    obsG.fillTriangle(
      TILE_SIZE * 0.2, TILE_SIZE * 0.8,
      TILE_SIZE * 0.5, TILE_SIZE * 0.2,
      TILE_SIZE * 0.8, TILE_SIZE * 0.8
    );
    obsG.generateTexture("tile_obstacle", TILE_SIZE, TILE_SIZE);

    // 4. 神弓光箭特效
    const arrowG = this.make.graphics({ x: 0, y: 0 });
    arrowG.lineStyle(3, 0xfacc15, 1);
    arrowG.lineBetween(0, 8, 32, 8);
    arrowG.fillStyle(0xfef08a, 1);
    arrowG.fillTriangle(32, 3, 40, 8, 32, 13);
    arrowG.generateTexture("fx_arrow", 40, 16);
  }
}
