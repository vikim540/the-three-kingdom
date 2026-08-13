import * as Phaser from "phaser";
import { EventBus, GAME_EVENTS } from "../EventBus";

export class InputManager {
  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private jKey!: Phaser.Input.Keyboard.Key;
  private moveTargetPointer: Phaser.GameObjects.Graphics | null = null;
  private isControlActive: boolean = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupInputListeners();
  }

  private setupInputListeners() {
    if (!this.scene.input || !this.scene.input.keyboard) return;

    // 1. 方向鍵與 WASD 鍵盤控制
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasdKeys = {
      W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // 空白鍵與 J 鍵實時揮刀攻擊 (Helbreath Attack Controls)
    this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.jKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);

    this.spaceKey.on("down", () => EventBus.emit("player-attack"));
    this.jKey.on("down", () => EventBus.emit("player-attack"));

    // 2. 移動目標波紋引導指示器
    this.moveTargetPointer = this.scene.add.graphics();
    this.moveTargetPointer.setDepth(10);
    this.moveTargetPointer.setVisible(false);

    // 3. 地圖點擊尋路移動 (Helbreath 風格)
    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.isControlActive) return;
      // 只有左鍵點擊地圖時發送移動指令
      if (pointer.leftButtonDown()) {
        const targetX = pointer.x;
        const targetY = pointer.y;

        // 播放點擊光圈動畫
        this.showClickIndicator(targetX, targetY);

        // 觸發 EventBus 請求主角移動
        EventBus.emit(GAME_EVENTS.REQUEST_MOVE, { x: targetX, y: targetY });
      }
    });
  }

  /**
   * Helbreath 風格：地圖點擊黃色衝擊波紋指示器
   */
  private showClickIndicator(x: number, y: number) {
    if (!this.moveTargetPointer) return;

    this.moveTargetPointer.setPosition(x, y);
    this.moveTargetPointer.setVisible(true);
    this.moveTargetPointer.clear();
    this.moveTargetPointer.lineStyle(2, 0xf59e0b, 1);
    this.moveTargetPointer.strokeCircle(0, 0, 8);

    this.scene.tweens.killTweensOf(this.moveTargetPointer);
    this.moveTargetPointer.setScale(0.5);
    this.moveTargetPointer.alpha = 1;

    this.scene.tweens.add({
      targets: this.moveTargetPointer,
      scaleX: 2.5,
      scaleY: 1.2,
      alpha: 0,
      duration: 350,
      ease: "Quad.out",
      onComplete: () => {
        if (this.moveTargetPointer) this.moveTargetPointer.setVisible(false);
      },
    });
  }

  /**
   * 每一幀檢測 WASD / 方向鍵按壓狀態，計算實時向量
   */
  public update(_delta: number): { dx: number; dy: number } {
    if (!this.isControlActive || !this.cursors || !this.wasdKeys) {
      return { dx: 0, dy: 0 };
    }

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasdKeys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasdKeys.S.isDown) dy += 1;

    // 歸一化方向向量
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    return { dx, dy };
  }

  public destroy() {
    if (this.moveTargetPointer) {
      this.moveTargetPointer.destroy();
    }
  }
}
