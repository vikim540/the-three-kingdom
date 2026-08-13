import * as Phaser from "phaser";
import { removeImageBackground } from "@/game/utils/imageChromaKey";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // 背景地圖素材
    this.load.image("forest_path_bg", "/assets/terrain/forest_path_bg.webp");
    this.load.image("battle_bg", "/assets/terrain/battle_bg.webp");
    this.load.image("fog_layer", "/assets/terrain/fog_layer.webp");

    // 載入 RAW 戰鬥立繪（用於摳圖處理）
    this.load.image("raw_live2d_protagonist",  "/assets/heroes/protagonist_live2d.webp");
    this.load.image("raw_live2d_huang_zhong",  "/assets/heroes/huang_zhong_live2d.webp");
    this.load.image("raw_live2d_bandit_chief", "/assets/heroes/bandit_chief_live2d.webp");
    this.load.image("raw_live2d_bandit_thug",  "/assets/heroes/bandit_thug_live2d.webp");

    // 載入名將卡牌立繪
    this.load.image("hero_protagonist",   "/assets/heroes/protagonist.webp");
    this.load.image("hero_huang_zhong",   "/assets/heroes/huang_zhong.webp");
    this.load.image("hero_xiahou_dun",    "/assets/heroes/xiahou_dun.webp");
    this.load.image("hero_zhao_yun",      "/assets/heroes/zhao_yun.webp");
    this.load.image("hero_guo_jia",       "/assets/heroes/guo_jia.webp");
    this.load.image("enemy_bandit_chief", "/assets/heroes/bandit_chief.webp");
    this.load.image("enemy_bandit_thug",  "/assets/heroes/bandit_thug.webp");

    // 載入失敗時，記錄錯誤便於調試（不靜默失敗）
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.error(`[BootScene] ⚠️ 素材載入失敗：${file.key} (${file.src})`);
    });
  }

  create() {
    // 依序執行摳圖，每一個都帶有安全回退：
    // 若摳圖後 texture 不存在（canvas 失敗），直接使用 raw_ 原圖替代，確保人物一定可見
    this.processWithFallback("raw_live2d_protagonist",  "live2d_protagonist");
    this.processWithFallback("raw_live2d_huang_zhong",  "live2d_huang_zhong");
    this.processWithFallback("raw_live2d_bandit_chief", "live2d_bandit_chief");
    this.processWithFallback("raw_live2d_bandit_thug",  "live2d_bandit_thug");

    this.scene.start("BattleScene");
  }

  /**
   * 安全摳圖處理，帶靜默失敗回退機制。
   * 若 removeImageBackground 產出的 targetKey 不存在（canvas 失敗/圖片尺寸為 0），
   * 直接將 raw 原始 texture 複製為 targetKey，確保角色一定出現在戰場上。
   */
  private processWithFallback(rawKey: string, targetKey: string) {
    try {
      removeImageBackground(this, rawKey, targetKey);
    } catch (err) {
      console.error(`[BootScene] removeImageBackground 異常：${rawKey}`, err);
    }

    // 若摳圖後 texture 仍不存在，直接使用 raw 原圖作為回退
    if (!this.textures.exists(targetKey)) {
      if (this.textures.exists(rawKey)) {
        console.warn(`[BootScene] 摳圖失敗，回退使用原始素材：${rawKey} → ${targetKey}`);
        // 從 raw texture frame 複製建立新的同名 key
        const rawTexture = this.textures.get(rawKey);
        const rawImage = rawTexture.getSourceImage() as HTMLImageElement;

        if (rawImage && rawImage.width > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = rawImage.width;
          canvas.height = rawImage.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(rawImage, 0, 0);
            this.textures.addCanvas(targetKey, canvas);
            console.info(`[BootScene] ✅ 回退成功，${targetKey} 使用原始素材渲染`);
          }
        }
      } else {
        console.error(`[BootScene] ❌ 原始素材也不存在：${rawKey}，角色將不可見！`);
      }
    } else {
      console.info(`[BootScene] ✅ 摳圖完成：${targetKey}`);
    }
  }
}
