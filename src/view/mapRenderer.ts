import type { GameStore, MapMode } from '../sim/store';
import { TERRAIN_EMOJI } from '../sim/engine';
import type { Terrain, Village } from '../data/types';
import { TIER_NAME } from '../data/types';
import {
  MAP_HEX_SIZE,
  HOME_VILLAGE_ID,
  rankValue,
  canManageVillage,
  canAct,
  VILLAGE_SPOTS,
  BUILDING_ROOMS,
  RESOURCE_KIND_META,
  type SpotAction,
} from '../data/config';
import { hexToPixel, hexCorners, hexKey, pixelToHex } from './hex';

// ===== 视图层（Canvas2D）：未来替换为 Phaser4 的唯一接缝 =====
// 职责：把 state 画成「俯视六边形格子地图」+ 把屏幕交互翻译成 store 指令。不含任何游戏规则。
// 数据层仍是村落节点图（点+边），本层只负责把村落「吸附」到六边形格子上渲染，绝不改动 SIM。
//
// 三阶地图（zoom 层级）：
//   level 1 = 大世界（村落节点图，现有玩法，指针悬停出轮盘）
//   level 2 = 村落详图（进入某村，hex 排布 村屋/农田/祠堂/市集… 点击地块经营）
//   level 3 = 房室内部（进入某建筑，hex 排布房间，点击房间经营）

// 地形底色（俯视地面的中调，区别于节点模式的高亮色）
const TERRAIN_FILL: Record<Terrain, string> = {
  plain: '#4d7c0f',
  forest: '#166534',
  hill: '#854d0e',
  mountain: '#44403c',
  river: '#0369a1',
  pass: '#5b21b6',
  city: '#991b1b',
};

// 村落地块配色（L2）：按地块类型着色，便于辨识
const SPOT_FILL: Record<string, string> = {
  home: '#7c2d12',
  weave: '#92400e',
  wood: '#14532d',
  farm: '#3f6212',
  shrine: '#6d28d9',
  well: '#0c4a6e',
  market: '#b45309',
};

// 村落地块点击后派发的统一回调（L2 地块 / L3 房间共用）
export type SpotActionHandler = (villageId: string, action: SpotAction) => void;

export class MapView {
  private ctx: CanvasRenderingContext2D;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private dragging = false;
  private moved = false;
  private lastX = 0;
  private lastY = 0;
  private hoveredId: string | null = null;

  private hexSize = MAP_HEX_SIZE;
  // 每帧重算：村落 id → 世界中心；六边形 key → 村落 id（用于精确六边形拾取）
  private centers = new Map<string, [number, number]>();
  private occupied = new Map<string, string>();

  // ===== 三阶地图状态 =====
  private level = 1; // 1 大世界 / 2 村落 / 3 房室
  private currentVillageId: string | null = null;
  private currentBuildingType: string | null = null;

  // 开发编辑模式：开启后可拖拽村落节点改位置；onDevMove 供编辑面板实时刷新坐标
  private devDrag = false;
  private devDragId: string | null = null;
  onDevMove: ((id: string) => void) | null = null;

  // 悬停回调（供 UI 层弹出轮盘交互）；空白点击回调（供 UI 收起轮盘）
  onHover: ((id: string | null, sx: number, sy: number) => void) | null = null;
  onBlank: (() => void) | null = null;
  // 每次渲染后回调（供轮盘随地图重绘重新定位）
  onRender: (() => void) | null = null;
  // 地块 / 房间点击回调（L2/L3）
  onSpotAction: SpotActionHandler | null = null;
  // 大世界资源点点击回调（L1，开采入口）
  onResourceClick: ((id: string) => void) | null = null;

  // L2/L3 簇命中表（屏幕坐标 + 地块 key），用于精确拾取
  private clusterHits: { key: string; x: number; y: number }[] = [];
  private hoveredCluster: string | null = null;
  // 大世界资源点命中表（屏幕坐标 + 资源点 id）
  private rpHits: { id: string; x: number; y: number }[] = [];

  // 地图背景图（编辑态上传 dataURL 或 public/assets 默认路径），缓存避免重复加载
  private bgImg: HTMLImageElement | null = null;
  private bgSrc = '';

  constructor(private canvas: HTMLCanvasElement, private store: GameStore) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    this.fit();
  }

  private worldToScreen(x: number, y: number): [number, number] {
    return [x * this.scale + this.offsetX, y * this.scale + this.offsetY];
  }
  private screenToWorld(x: number, y: number): [number, number] {
    return [(x - this.offsetX) / this.scale, (y - this.offsetY) / this.scale];
  }

  // 村落世界坐标 → 吸附到最近六边形中心（保持村落仍在节点图上，仅渲染对齐格子）
  private snappedCenter(v: Village): [number, number] {
    const [q, r] = pixelToHex(v.position[0], v.position[1], this.hexSize);
    return hexToPixel(q, r, this.hexSize);
  }

  private fit(): void {
    const cs = this.store.state.villages.map((v) => this.snappedCenter(v));
    const xs = cs.map((c) => c[0]);
    const ys = cs.map((c) => c[1]);
    const minX = Math.min(...xs) - this.hexSize * 1.6;
    const maxX = Math.max(...xs) + this.hexSize * 1.6;
    const minY = Math.min(...ys) - this.hexSize * 1.9;
    const maxY = Math.max(...ys) + this.hexSize * 1.9;
    const w = maxX - minX;
    const h = maxY - minY;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    this.scale = Math.min(cw / w, ch / h);
    this.offsetX = (cw - w * this.scale) / 2 - minX * this.scale;
    this.offsetY = (ch - h * this.scale) / 2 - minY * this.scale;
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.level === 1) this.fit();
    this.render();
  }

  // 滚轮：鼠标控制进入三层地图（免去重复点击）。
  //   向下（deltaY>0）= 下钻进入；向上 = 退出上一层；其余缩放世界地图。
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const drill = e.deltaY > 0;
    if (this.level === 1) {
      const hit = this.hitTest(e.offsetX, e.offsetY);
      if (hit && this.canEnterVillage(hit) && drill) {
        this.enterVillage(hit); // 滚轮下钻进入村落
        return;
      }
    } else if (this.level === 2) {
      if (!drill) {
        this.exitToWorld();
        return;
      }
      const key = this.hitCluster(e.offsetX, e.offsetY);
      if (key) {
        const spot = VILLAGE_SPOTS.find((s) => s.type === key);
        if (spot && spot.action.kind === 'enter') {
          this.enterBuilding(spot.action.room);
          return;
        }
      }
      return; // L2 不缩放
    } else if (this.level === 3) {
      if (!drill) {
        this.exitToVillage();
        return;
      }
      return; // L3 已最深层
    }
    // 默认：缩放世界地图（仅 L1 视觉生效）
    const [wx, wy] = this.screenToWorld(e.offsetX, e.offsetY);
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    this.scale = Math.max(0.3, Math.min(4, this.scale * factor));
    this.offsetX = e.offsetX - wx * this.scale;
    this.offsetY = e.offsetY - wy * this.scale;
    this.render();
  }

  // 开发模式开关：开启后 pointerdown 命中节点即进入「节点拖拽」，否则画布平移
  setDevDrag(on: boolean): void {
    this.devDrag = on;
    if (!on) this.devDragId = null;
  }

  // ===== 三阶地图导航（供 UI 面包屑 / 轮盘 调用）=====
  getLevel(): number {
    return this.level;
  }
  currentVillageName(): string {
    const v = this.store.state.villages.find((x) => x.id === this.currentVillageId);
    return v ? v.name : '';
  }
  currentBuildingName(): string {
    const s = VILLAGE_SPOTS.find((x) => x.type === this.currentBuildingType);
    return s ? s.name : '';
  }
  canEnterVillage(id: string): boolean {
    return id === HOME_VILLAGE_ID || rankValue(this.store.state.title) >= 2;
  }
  enterVillage(id: string): void {
    if (!this.canEnterVillage(id)) return;
    this.level = 2;
    this.currentVillageId = id;
    this.currentBuildingType = null;
    this.hoveredCluster = null;
    this.store.touch();
  }
  enterBuilding(spotType: string): void {
    if (!this.currentVillageId) return;
    if (!this.canEnterVillage(this.currentVillageId)) return;
    this.level = 3;
    this.currentBuildingType = spotType;
    this.hoveredCluster = null;
    this.store.touch();
  }
  exitToVillage(): void {
    this.level = 2;
    this.currentBuildingType = null;
    this.store.touch();
  }
  exitToWorld(): void {
    this.level = 1;
    this.currentVillageId = null;
    this.currentBuildingType = null;
    this.store.touch();
  }

  private onDown(e: PointerEvent): void {
    if (this.level !== 1) return; // L2/L3 仅点击，不平移
    if (this.devDrag) {
      const hit = this.hitTest(e.offsetX, e.offsetY);
      if (hit) {
        this.devDragId = hit;
        this.moved = false;
        return;
      }
      this.dragging = true;
      this.moved = false;
      this.lastX = e.offsetX;
      this.lastY = e.offsetY;
      return;
    }
    this.dragging = true;
    this.moved = false;
    this.lastX = e.offsetX;
    this.lastY = e.offsetY;
  }
  private onMove(e: PointerEvent): void {
    if (this.level !== 1) {
      // L2/L3：悬停高亮地块/房间
      const hit = this.hitCluster(e.offsetX, e.offsetY);
      if (hit !== this.hoveredCluster) {
        this.hoveredCluster = hit;
        this.render();
      }
      return;
    }
    // 开发模式：拖拽村落节点改位置（直接改 state.position，绕过游戏规则）
    if (this.devDrag && this.devDragId) {
      const [wx, wy] = this.screenToWorld(e.offsetX, e.offsetY);
      const v = this.store.state.villages.find((x) => x.id === this.devDragId);
      if (v) {
        v.position = [Math.round(wx), Math.round(wy)];
        this.moved = true;
        this.render();
        this.onDevMove?.(this.devDragId);
      }
      return;
    }
    if (this.dragging) {
      const dx = e.offsetX - this.lastX;
      const dy = e.offsetY - this.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.moved = true;
      this.offsetX += dx;
      this.offsetY += dy;
      this.lastX = e.offsetX;
      this.lastY = e.offsetY;
      this.render();
      return;
    }
    // 悬停检测：非拖拽时报告命中的村落节点
    const hit = this.hitTest(e.offsetX, e.offsetY);
    if (hit !== this.hoveredId) {
      this.hoveredId = hit;
      this.render();
      this.onHover?.(hit, e.offsetX, e.offsetY);
    }
  }
  private onUp(e: PointerEvent): void {
    if (this.level === 2 || this.level === 3) {
      const key = this.hitCluster(e.offsetX, e.offsetY);
      if (!key) return;
      const vid = this.currentVillageId!;
      if (this.level === 2) {
        const spot = VILLAGE_SPOTS.find((s) => s.type === key);
        if (!spot) return;
        if (spot.action.kind === 'enter') this.enterBuilding(spot.action.room);
        else this.onSpotAction?.(vid, spot.action);
      } else {
        const rooms = BUILDING_ROOMS[this.currentBuildingType ?? ''] ?? [];
        const idx = Number(key);
        const room = rooms[idx];
        if (room) this.onSpotAction?.(vid, room.action);
      }
      return;
    }
    // 开发模式节点拖拽结束：落盘并自动存档；未移动则视为选中该节点
    if (this.devDrag && this.devDragId) {
      const id = this.devDragId;
      this.devDragId = null;
      if (this.moved) {
        this.moved = false;
        this.store.commit();
      } else {
        this.store.select(id);
      }
      return;
    }
    this.dragging = false;
    if (this.moved) return;
    // 先判资源点（开采入口），再判村落
    const rp = this.hitResourcePoint(e.offsetX, e.offsetY);
    if (rp) {
      this.onResourceClick?.(rp);
      return;
    }
    const hit = this.hitTest(e.offsetX, e.offsetY);
    if (hit) this.store.select(hit);
    else this.onBlank?.();
  }

  // 取某村落在屏幕上的像素坐标（供轮盘定位）
  screenPos(id: string): [number, number] | null {
    const c = this.centers.get(id) ?? this.snappedCenterSafe(id);
    if (!c) return null;
    return this.worldToScreen(c[0], c[1]);
  }
  private snappedCenterSafe(id: string): [number, number] | null {
    const v = this.store.state.villages.find((x) => x.id === id);
    return v ? this.snappedCenter(v) : null;
  }

  // 六边形精确拾取：点击点所属格 → 查 occupied 表
  hitTest(sx: number, sy: number): string | null {
    const [wx, wy] = this.screenToWorld(sx, sy);
    const [q, r] = pixelToHex(wx, wy, this.hexSize);
    return this.occupied.get(hexKey(q, r)) ?? null;
  }
  // L2/L3 簇命中：找最近地块中心（半径内）
  private hitCluster(sx: number, sy: number): string | null {
    for (const h of this.clusterHits) {
      const dx = sx - h.x;
      const dy = sy - h.y;
      if (dx * dx + dy * dy <= (this.hexSize * 0.9) ** 2) return h.key;
    }
    return null;
  }
  // L1 资源点命中：找最近资源点（半径内）
  private hitResourcePoint(sx: number, sy: number): string | null {
    const r = (this.hexSize * 0.7) ** 2;
    for (const h of this.rpHits) {
      const dx = sx - h.x;
      const dy = sy - h.y;
      if (dx * dx + dy * dy <= r) return h.id;
    }
    return null;
  }

  // 地图背景图：编辑态上传优先，否则默认 parchment.svg
  private ensureBg(src: string): void {
    if (this.bgSrc === src) return;
    this.bgSrc = src;
    const img = new Image();
    img.onload = () => this.render();
    img.src = src;
    this.bgImg = img;
  }
  // 绘制全画布底图（背景图或兜底渐变）
  private paintBackdrop(): void {
    const { ctx } = this;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    const src = this.store.state.assets?.mapBackground ?? '/assets/backgrounds/parchment.svg';
    this.ensureBg(src);
    if (this.bgImg && this.bgImg.complete && this.bgImg.naturalWidth) {
      ctx.drawImage(this.bgImg, 0, 0, cw, ch);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, '#1e293b');
      g.addColorStop(1, '#0f172a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
    }
  }
  // 底部操作提示（悬停可下钻目标时显示）
  private drawHint(text: string): void {
    const { ctx } = this;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 28;
    const y = ch - 24;
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    ctx.fillRect(cw / 2 - w / 2, y - 15, w, 30);
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cw / 2 - w / 2, y - 15, w, 30);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(text, cw / 2, y);
  }

  render(): void {
    if (this.level === 1) this.renderWorld();
    else if (this.level === 2) this.renderVillage();
    else this.renderBuilding();
  }

  // ===== L1 大世界（现有村落节点图）=====
  private renderWorld(): void {
    const { ctx } = this;
    const s = this.store.state;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    this.paintBackdrop();

    // 1) 计算各村落所占六边形（轴向 + 世界中心），并解决两村同格碰撞
    const taken = new Set<string>();
    const cell = new Map<string, [number, number]>();
    const centers = new Map<string, [number, number]>();
    for (const v of s.villages) {
      let [q, r] = pixelToHex(v.position[0], v.position[1], this.hexSize);
      while (taken.has(hexKey(q, r))) r++;
      taken.add(hexKey(q, r));
      cell.set(v.id, [q, r]);
      centers.set(v.id, hexToPixel(q, r, this.hexSize));
    }
    this.centers = centers;
    this.occupied = new Map<string, string>();
    for (const [id, [q, r]] of cell) this.occupied.set(hexKey(q, r), id);

    // 村落所在格的地形（保证村落格与其地形一致）
    const villTerrain = new Map<string, Terrain>();
    for (const [id, [q, r]] of cell) {
      const v = s.villages.find((x) => x.id === id)!;
      villTerrain.set(hexKey(q, r), v.terrain);
    }

    // 2) 网格范围（外扩边距，形成连续俯视格子地图）
    const qs = [...cell.values()].map((c) => c[0]);
    const rs = [...cell.values()].map((c) => c[1]);
    const margin = 5;
    const q0 = Math.min(...qs) - margin;
    const q1 = Math.max(...qs) + margin;
    const r0 = Math.min(...rs) - margin;
    const r1 = Math.max(...rs) + margin;

    // 3) 背景六边形（地形 / 荒野，按地图模式着色 + 细格线）
    for (let q = q0; q <= q1; q++) {
      for (let r = r0; r <= r1; r++) {
        const [cx, cy] = hexToPixel(q, r, this.hexSize);
        const [sx, sy] = this.worldToScreen(cx, cy);
        const terr = villTerrain.get(hexKey(q, r)) ?? hashTerrain(q, r);
        this.drawHex(sx, sy, this.tileFill(null, terr, s.mapMode), 'rgba(148,163,184,0.10)', 1);
      }
    }

    // 4) 道路（村落间连线，随类型区分样式）
    for (const rt of s.routes) {
      const a = centers.get(rt.from);
      const b = centers.get(rt.to);
      if (!a || !b) continue;
      const [ax, ay] = this.worldToScreen(a[0], a[1]);
      const [bx, by] = this.worldToScreen(b[0], b[1]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineWidth = 3;
      ctx.strokeStyle = rt.type === 'river' ? '#0ea5e9' : rt.type === 'pass' ? '#7c3aed' : '#64748b';
      ctx.setLineDash(rt.type === 'road' ? [6, 6] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5) 村落六边形（归属着色 + 地形 emoji + 标签 + 选中/悬停环）
    for (const v of s.villages) {
      const c = centers.get(v.id)!;
      const [x, y] = this.worldToScreen(c[0], c[1]);
      const f = s.factions.find((fl) => fl.id === v.owner)!;

      this.drawHex(x, y, this.tileFill(v, v.terrain, s.mapMode), f.color, 3);

      ctx.font = `${Math.round(this.hexSize * 0.7 * Math.min(this.scale, 1.3))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(TERRAIN_EMOJI[v.terrain], x, y - 2);

      if (v.heroVillage) {
        const hero = s.heroes.find((h) => h.id === v.heroVillage);
        const em = hero ? hero.emoji : '⭐';
        ctx.font = `${Math.round(this.hexSize * 0.45)}px sans-serif`;
        ctx.fillText(em, x + this.hexSize * 0.6, y - this.hexSize * 0.6);
      }

      ctx.font = `${Math.round(12 * Math.min(this.scale, 1.3))}px sans-serif`;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(v.name, x, y + this.hexSize * 0.78);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.fillText(`${TIER_NAME[v.tier]}·Lv${v.level} · 👥${v.population}`, x, y + this.hexSize * 0.78 + 14);

      if (s.selectedId === v.id) {
        this.drawHex(x, y, null, '#f8fafc', 3, true);
      } else if (this.hoveredId === v.id) {
        this.drawHex(x, y, null, '#38bdf8', 2, true);
      }
    }

    // 大世界资源点（事件分支生成）：emoji + 储量条 + 命中表
    this.rpHits = [];
    for (const p of s.resourcePoints) {
      if (p.depleted) continue;
      const [wx, wy] = p.position;
      const [sx, sy] = this.worldToScreen(wx, wy);
      ctx.font = `${Math.round(this.hexSize * 0.7 * Math.min(this.scale, 1.3))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, sx, sy);
      // 储量条
      const bw = this.hexSize * 0.9;
      const bx = sx - bw / 2;
      const by = sy + this.hexSize * 0.5;
      ctx.fillStyle = 'rgba(15,23,42,0.7)';
      ctx.fillRect(bx, by, bw, 4);
      const pct = Math.max(0, Math.min(1, p.stock / p.maxStock));
      ctx.fillStyle = RESOURCE_KIND_META[p.kind].color;
      ctx.fillRect(bx, by, bw * pct, 4);
      this.rpHits.push({ id: p.id, x: sx, y: sy });
    }

    if (this.hoveredId && this.canEnterVillage(this.hoveredId))
      this.drawHint('🖱️ 滚轮向下：进入村落　·　向上：缩放地图');
    this.onRender?.();
  }

  // ===== L2 村落详图（进入某村，hex 排布地块）=====
  private renderVillage(): void {
    const { ctx } = this;
    const s = this.store.state;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    this.paintBackdrop();
    ctx.fillStyle = 'rgba(15,23,42,0.72)';
    ctx.fillRect(0, 0, cw, ch);

    const vid = this.currentVillageId!;
    const v = s.villages.find((x) => x.id === vid)!;
    const spots = VILLAGE_SPOTS;
    const layout = ringLayout(spots.length);
    const px = layout.map(([q, r]) => hexToPixel(q, r, this.hexSize));
    const cx = px.reduce((a, p) => a + p[0], 0) / px.length;
    const cy = px.reduce((a, p) => a + p[1], 0) / px.length;
    const tx = cw / 2 - cx;
    const ty = ch / 2 - cy + 10;

    this.clusterHits = [];
    spots.forEach((sp, i) => {
      const x = px[i][0] + tx;
      const y = px[i][1] + ty;
      const allowed = this.spotAllowed(vid, sp.action);
      const hovered = this.hoveredCluster === sp.type;
      this.drawHex(x, y, SPOT_FILL[sp.type] ?? '#334155', allowed ? (hovered ? '#f8fafc' : '#94a3b8') : '#475569', 3);
      // emoji
      ctx.font = `${Math.round(this.hexSize * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sp.emoji, x, y - 4);
      // 名称
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = allowed ? '#f1f5f9' : '#94a3b8';
      ctx.fillText(sp.name, x, y + this.hexSize * 0.62);
      // 锁定图标
      if (!allowed && sp.action.kind !== 'enter' && sp.action.kind !== 'none') {
        ctx.font = `${Math.round(this.hexSize * 0.5)}px sans-serif`;
        ctx.fillText('🔒', x + this.hexSize * 0.62, y - this.hexSize * 0.62);
      }
      this.clusterHits.push({ key: sp.type, x, y });
    });

    // 顶部标题
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${v.name} · 村落详图`, cw / 2, 28);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('点击地块经营；点「祠堂/农田/水井/市集」可进入房室。滚轮下钻更顺畅。', cw / 2, 46);
    if (this.hoveredCluster) {
      const sp = VILLAGE_SPOTS.find((s) => s.type === this.hoveredCluster);
      if (sp && sp.action.kind === 'enter')
        this.drawHint('🖱️ 滚轮向下：进入房室　·　向上：退回大世界');
    }
    this.onRender?.();
  }

  // ===== L3 房室内部（进入某建筑，hex 排布房间）=====
  private renderBuilding(): void {
    const { ctx } = this;
    const s = this.store.state;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    this.paintBackdrop();
    ctx.fillStyle = 'rgba(2,6,23,0.8)';
    ctx.fillRect(0, 0, cw, ch);

    const vid = this.currentVillageId!;
    const rooms = BUILDING_ROOMS[this.currentBuildingType ?? ''] ?? [];
    const layout = ringLayout(Math.max(rooms.length, 1));
    const px = layout.map(([q, r]) => hexToPixel(q, r, this.hexSize));
    const cx = px.reduce((a, p) => a + p[0], 0) / px.length;
    const cy = px.reduce((a, p) => a + p[1], 0) / px.length;
    const tx = cw / 2 - cx;
    const ty = ch / 2 - cy + 10;

    const bName = this.currentBuildingName();
    this.clusterHits = [];
    rooms.forEach((rm, i) => {
      const x = px[i][0] + tx;
      const y = px[i][1] + ty;
      const allowed = this.spotAllowed(vid, rm.action);
      const hovered = this.hoveredCluster === String(i);
      this.drawHex(x, y, '#334155', allowed ? (hovered ? '#f8fafc' : '#94a3b8') : '#475569', 3);
      ctx.font = `${Math.round(this.hexSize * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rm.emoji, x, y - 4);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = allowed ? '#f1f5f9' : '#94a3b8';
      ctx.fillText(rm.name, x, y + this.hexSize * 0.62);
      if (!allowed && rm.action.kind !== 'enter' && rm.action.kind !== 'none') {
        ctx.font = `${Math.round(this.hexSize * 0.5)}px sans-serif`;
        ctx.fillText('🔒', x + this.hexSize * 0.62, y - this.hexSize * 0.62);
      }
      this.clusterHits.push({ key: String(i), x, y });
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${bName} · 内部`, cw / 2, 28);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('点击房间经营；右上角可返回村落 / 大世界。', cw / 2, 46);
    this.drawHint('🖱️ 滚轮向上：退回村落');
    this.onRender?.();
  }

  // 地块/房间是否可执行（与 UI 权限闸门一致）
  private spotAllowed(villageId: string, action: SpotAction): boolean {
    const title = this.store.state.title;
    if (action.kind === 'personal') {
      if (action.id === 'shrine') return rankValue(title) >= 1 && canManageVillage(title, villageId);
      return villageId === HOME_VILLAGE_ID || rankValue(title) >= 4;
    }
    if (action.kind === 'perm') return canAct(title, action.id) && canManageVillage(title, villageId);
    if (action.kind === 'build') return canAct(title, 'build') && canManageVillage(title, villageId);
    if (action.kind === 'upgrade') return canAct(title, 'upgrade') && canManageVillage(title, villageId);
    return true; // enter / none 永远可点（none 仅观览）
  }

  // 单格填充色（按地图模式）
  private tileFill(v: Village | null, terrain: Terrain, mode: MapMode): string {
    if (mode === 'terrain') return TERRAIN_FILL[terrain];
    if (mode === 'elevation') {
      const e = v ? v.elevation : 0;
      return `hsl(210, 30%, ${30 + e * 14}%)`;
    }
    if (v) {
      const f = this.store.state.factions.find((x) => x.id === v.owner)!;
      return this.hexA(f.color, 0.5);
    }
    return this.hexA(TERRAIN_FILL[terrain], 0.4);
  }

  // 绘制一个六边形（屏幕坐标）
  private drawHex(
    cx: number,
    cy: number,
    fill: string | null,
    stroke: string | null,
    lineWidth: number,
    dashed = false,
  ): void {
    const pts = hexCorners(cx, cy, this.hexSize * (this.level === 1 ? this.scale : 1));
    const { ctx } = this;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      if (dashed) ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // 将视口居中到指定村落（供「前往故里/聚焦地点」使用）
  focus(id: string): void {
    const v = this.store.state.villages.find((x) => x.id === id);
    if (!v) return;
    const [wx, wy] = this.snappedCenter(v);
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    this.offsetX = cw / 2 - wx * this.scale;
    this.offsetY = ch / 2 - wy * this.scale;
    this.render();
  }

  private hexA(hex: string, a: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${(n & 255)},${a})`;
  }
}

// 簇布局：中心 + 至多 6 个相邻 hex（紧凑六边形），用于 L2/L3 排布
function ringLayout(n: number): [number, number][] {
  if (n <= 1) return [[0, 0]];
  const dirs: [number, number][] = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];
  const out: [number, number][] = [[0, 0]];
  for (let i = 1; i < n; i++) out.push(dirs[(i - 1) % 6]);
  return out;
}

// 荒野格确定性地形（哈希噪声，保证每次渲染一致、 varied 但不随机）
function hashTerrain(q: number, r: number): Terrain {
  let h = (q * 73856093) ^ (r * 19349663) ^ 0x9e3779b9;
  h = (h ^ (h >>> 13)) >>> 0;
  const t = h % 100;
  if (t < 50) return 'plain';
  if (t < 70) return 'forest';
  if (t < 85) return 'hill';
  if (t < 95) return 'river';
  return 'mountain';
}
