import * as Phaser from "phaser";

/**
 * 深度多層 Canvas 摳圖演算法：
 * 徹底消滅 AI 生成圖片邊緣與內部的灰白/棋盤格/雜點背景，產出 100% 純淨透明底角色立繪
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

  // 判定背景像素（棋盤格灰色/白色/淡灰/暗灰邊緣）
  const isBgColor = (r: number, g: number, b: number) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;

    // 棋盤格背景條件 1：高亮度低飽和度 (灰白格子)
    if (r > 115 && g > 115 && b > 115 && saturation < 35) {
      return true;
    }
    // 棋盤格背景條件 2：暗灰格子
    if (r > 70 && r < 140 && saturation < 15) {
      return true;
    }
    return false;
  };

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
      data[pIdx + 3] = 0; // 徹底全透明

      if (x > 0) queue.push(x - 1, y);
      if (x < w - 1) queue.push(x + 1, y);
      if (y > 0) queue.push(x, y - 1);
      if (y < h - 1) queue.push(x, y + 1);
    }
  }

  // 全局二次色差殘留判定 (清理獨立背景孤島點)
  for (let i = 0; i < w * h; i++) {
    const pIdx = i * 4;
    const r = data[pIdx];
    const g = data[pIdx + 1];
    const b = data[pIdx + 2];
    const a = data[pIdx + 3];

    if (a > 0 && isBgColor(r, g, b)) {
      const x = i % w;
      const y = Math.floor(i / w);
      // 如果位於圖片靠外圍區域且符合背景特徵，強制設為透明
      if (x < w * 0.22 || x > w * 0.78 || y < h * 0.22 || y > h * 0.78) {
        data[pIdx + 3] = 0;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  scene.textures.addCanvas(targetKey, canvas);
}
