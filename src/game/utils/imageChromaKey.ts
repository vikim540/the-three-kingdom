import * as Phaser from "phaser";

/**
 * 客戶端 Canvas 動態扣圖演算法：
 * 自動識別並抹除 AI 生成圖片周圍的網格/灰白棋盤格背景，實現 100% 純淨透明底色角色立繪
 */
export function removeImageBackground(
  scene: Phaser.Scene,
  originalKey: string,
  targetKey: string,
  threshold: number = 145
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

  // 從圖片四周邊緣像素點注入種子
  for (let x = 0; x < w; x++) {
    queue.push(x, 0);
    queue.push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    queue.push(0, y);
    queue.push(w - 1, y);
  }

  // 判定是否為背景棋盤格/灰白像素
  const isBackgroundPixel = (r: number, g: number, b: number) => {
    // 灰白棋盤格像素 (r,g,b 相近且高於閾值)
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    return r >= threshold && g >= threshold && b >= threshold && maxDiff < 30;
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

    if (isBackgroundPixel(r, g, b)) {
      data[pIdx + 3] = 0; // 設為 100% 全透明

      // 向四周氾濫蔓延
      if (x > 0) queue.push(x - 1, y);
      if (x < w - 1) queue.push(x + 1, y);
      if (y > 0) queue.push(x, y - 1);
      if (y < h - 1) queue.push(x, y + 1);
    }
  }

  // 二次羽化修邊 (平滑角色邊緣)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] > 0) {
        let transparentNeighbors = 0;
        const neighborOffsets = [-w - 1, -w, -w + 1, -1, 1, w - 1, w, w + 1];
        for (const offset of neighborOffsets) {
          if (data[(y * w + x + offset) * 4 + 3] === 0) {
            transparentNeighbors++;
          }
        }
        if (transparentNeighbors >= 5) {
          data[idx + 3] = 0;
        } else if (transparentNeighbors >= 2) {
          data[idx + 3] = Math.floor(data[idx + 3] * 0.6);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  scene.textures.addCanvas(targetKey, canvas);
}
