// ===== 六边形格子系统（俯视策略地图底层几何）=====
// 采用 pointy-top（尖顶）轴向坐标，公式取自学界标准实现（Red Blob Games），
// 属通用几何算法，非重复造轮子——本文件仅作视图层的几何工具，不依赖任何游戏规则。

export type Axial = [number, number]; // [q, r]

// 轴向坐标 → 世界像素（尖顶六边形）
export function hexToPixel(q: number, r: number, size: number): [number, number] {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return [x, y];
}

// 世界像素 → 轴向坐标（含立方取整，得到最近的整数六边形）
export function pixelToHex(x: number, y: number, size: number): Axial {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return axialRound(q, r);
}

// 立方体取整（标准算法：比对三维舍入误差，修正最大偏差轴）
function axialRound(qf: number, rf: number): Axial {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  let s = Math.round(sf);
  const qd = Math.abs(q - qf);
  const rd = Math.abs(r - rf);
  const sd = Math.abs(s - sf);
  if (qd > rd && qd > sd) q = -r - s;
  else if (rd > sd) r = -q - s;
  return [q, r];
}

// 六边形六个顶点（尖顶，30° 偏置）
export function hexCorners(cx: number, cy: number, size: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 180) * (60 * i - 30);
    pts.push([cx + size * Math.cos(ang), cy + size * Math.sin(ang)]);
  }
  return pts;
}

export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}
