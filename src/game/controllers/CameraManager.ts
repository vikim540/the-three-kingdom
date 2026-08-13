import * as Phaser from "phaser";

export interface CameraManagerConfig {
  scene: Phaser.Scene;
  getFollowTarget: () => { x: number; y: number } | undefined;
}

export class CameraManager {
  private scene: Phaser.Scene;
  private getFollowTarget: () => { x: number; y: number } | undefined;
  private cameraFollowEnabled: boolean = true;
  private zoomLevel: number = 1.0;

  constructor(config: CameraManagerConfig) {
    this.scene = config.scene;
    this.getFollowTarget = config.getFollowTarget;
  }

  /**
   * 設置大世界地圖邊界 (World Bounds)
   */
  public setWorldBounds(width: number, height: number) {
    const camera = this.scene.cameras.main;
    if (camera) {
      camera.setBounds(0, 0, width, height);
    }
  }

  /**
   * 每一幀更新攝影機位置，跟隨主角 (Helbreath Camera Tracking)
   */
  public update() {
    const camera = this.scene.cameras.main;
    if (!camera || !this.cameraFollowEnabled) return;

    const target = this.getFollowTarget();
    if (target) {
      // 鏡頭平滑插值追蹤主角 (Lerp)
      const targetScrollX = target.x - camera.width / 2;
      const targetScrollY = target.y - camera.height / 2;

      camera.scrollX = Phaser.Math.Linear(camera.scrollX, targetScrollX, 0.1);
      camera.scrollY = Phaser.Math.Linear(camera.scrollY, targetScrollY, 0.1);
    }
  }

  public setZoom(zoom: number) {
    this.zoomLevel = Phaser.Math.Clamp(zoom, 0.5, 2.0);
    if (this.scene.cameras.main) {
      this.scene.cameras.main.setZoom(this.zoomLevel);
    }
  }

  public setFollowEnabled(enabled: boolean) {
    this.cameraFollowEnabled = enabled;
  }

  public destroy() {
    // 資源清理
  }
}
