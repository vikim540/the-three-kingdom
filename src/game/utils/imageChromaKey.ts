import * as Phaser from "phaser";

/**
 * 精準低侵入性 Canvas 摳圖演算法：
 * 專門針對 AI 生成的棋盤格背景（rgba 灰白相間），使用邊緣種子泛洪填充法。
 * 僅消滅從四週連通的背景色塊，內部任何像素（含白色衣物、白鬍鬚）均不受影響。
 * 關鍵修復：大幅收窄 isBgColor 閾值，確保角色不被誤抹除。
 */
export function removeImageBackground(
  scene: Phaser.Scene,
  originalKey: string,
  targetKey: string
) {
  if (scene.textures.exists(targetKey)) {
    return;
  }

  const texture = scene.textures.get(originalKey);
  const image = texture.getSourceImage() as HTMLImageElement;
  if (!image || !image.width || !image.height) return;

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  ctx.drawImage(image, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const w = canvas.width;
  const h = canvas.height;

  const visited = new Uint8Array(w * h);
  const queue: number[] = [];

  // 從四周邊緣注入種子
  for (let x = 0; x < w; x++) {
    queue.push(x, 0);
    queue.push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    queue.push(0, y);
    queue.push(w - 1, y);
  }

  /**
   * 🔴 修復：大幅收窄 isBgColor 閾值，只消滅真正的棋盤格灰白格子
   * 舊版：r > 115 && g > 115 && b > 115 && saturation < 35  ← 太寬，白袍白鬚被誤刪
   * 新版：只有非常高亮度（>195）且幾乎無飽和度（<18）的像素才算背景
   * 棋盤格淺色格：RGB 約 (230,230,230)；棋盤格深色格：RGB 約 (180,180,180)
   * 角色皮膚/衣物最低飽和度都 > 30，不會被誤刪
   */
  const isBgColor = (r: number, g: number, b: number) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;

    // 極高亮度、極低飽和度：棋盤淺灰/白格
    if (r > 195 && g > 195 && b > 195 && saturation < 18) {
      return true;
    }
    // 中等亮度、極低飽和度：棋盤深灰格
    if (r > 155 && r < 200 && g > 155 && g < 200 && b > 155 && b < 200 && saturation < 12) {
      return true;
    }
    return false;
  };

  // BFS 邊緣泛洪填充：只從邊緣連通的背景色才清除
  while (queue.length > 0) {
    const y = queue.pop()!;
    const x = queue.pop()!;
    const idx = y * w + x;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const pIdx = idx * 4;
    const r = data[pIdx];
    const g = data[pIdx + 1];
    const b = data[pIdx + 2];

    if (isBgColor(r, g, b)) {
      data[pIdx + 3] = 0; // 全透明

      if (x > 0) queue.push(x - 1, y);
      if (x < w - 1) queue.push(x + 1, y);
      if (y > 0) queue.push(x, y - 1);
      if (y < h - 1) queue.push(x, y + 1);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  scene.textures.addCanvas(targetKey, canvas);
}
