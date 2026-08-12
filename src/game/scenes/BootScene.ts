import * as Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this.load.image("forest_path_bg", "/assets/terrain/forest_path_bg.webp");
    this.load.image("battle_bg", "/assets/terrain/battle_bg.webp");
    this.load.image("fog_layer", "/assets/terrain/fog_layer.webp");

    // 載入 2D 高清 Live2D 動態戰鬥角色圖案 (無任何 SVG，完美去背景)
    this.load.image("live2d_protagonist", "/assets/heroes/protagonist_live2d.webp");
    this.load.image("live2d_huang_zhong", "/assets/heroes/huang_zhong_live2d.webp");
    this.load.image("live2d_bandit_chief", "/assets/heroes/bandit_chief_live2d.webp");
    this.load.image("live2d_bandit_thug", "/assets/heroes/bandit_thug_live2d.webp");

    // 載入名將卡牌立繪
    this.load.image("hero_protagonist", "/assets/heroes/protagonist.webp");
    this.load.image("hero_huang_zhong", "/assets/heroes/huang_zhong.webp");
    this.load.image("hero_xiahou_dun", "/assets/heroes/xiahou_dun.webp");
    this.load.image("hero_zhao_yun", "/assets/heroes/zhao_yun.webp");
    this.load.image("hero_guo_jia", "/assets/heroes/guo_jia.webp");
    this.load.image("enemy_bandit_chief", "/assets/heroes/bandit_chief.webp");
    this.load.image("enemy_bandit_thug", "/assets/heroes/bandit_thug.webp");
  }

  create() {
    this.scene.start("BattleScene");
  }
}
