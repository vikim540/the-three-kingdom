import './styles.css';
import { liubeiRealm } from './data/scenario';
import { GameStore } from './sim/store';
import { MapView } from './view/mapRenderer';
import { mountUI } from './ui/hud';
import { RadialMenu } from './ui/radialMenu';
import { mountDevPanel } from './ui/devPanel';
import { EditOverlay } from './ui/editOverlay';
import { isModalOpen, closeModal, openModal } from './ui/modal';
import {
  rankValue,
  canAct,
  canManageVillage,
  PERM_RANK,
  rankName,
  HOME_VILLAGE_ID,
  type SpotAction,
  type PersonalActionId,
} from './data/config';

const app = document.getElementById('app')!;
app.innerHTML = `
  <div class="relative w-screen h-screen bg-slate-900 overflow-hidden">
    <canvas id="map" class="absolute inset-0 w-full h-full"></canvas>
    <div id="ui"></div>
  </div>`;

const canvas = document.getElementById('map') as HTMLCanvasElement;
const store = new GameStore(liubeiRealm);
const uiRoot = document.getElementById('ui')!;

const view = new MapView(canvas, store);

// 聚焦某地：选中 + 视口居中（供「前往故里/关系跳转」）
const focusVillage = (id: string): void => {
  store.select(id);
  view.focus(id);
};

// 地图三阶导航控制（包裹 MapView，供 HUD 面包屑调用）
const mapCtl = {
  getNav: () => ({
    level: view.getLevel(),
    village: view.currentVillageName(),
    building: view.currentBuildingName(),
  }),
  enterVillage: (id: string) => view.enterVillage(id),
  exitToVillage: () => view.exitToVillage(),
  exitToWorld: () => view.exitToWorld(),
};

const ui = mountUI(uiRoot, store, liubeiRealm, focusVillage, mapCtl);

// 个人营生（轮盘点击）：权限复核后落地
const personalAction = (villageId: string, id: PersonalActionId): void => {
  const title = store.state.title;
  if (id === 'shrine') {
    if (rankValue(title) >= 1 && canManageVillage(title, villageId)) store.visitShrine(villageId);
    else ui.notifyLocked('需晋升里长方可祭祖聚族。');
    return;
  }
  if (villageId === HOME_VILLAGE_ID || rankValue(title) >= 4) {
    if (id === 'weave') store.weave();
    else if (id === 'chop') store.chopWood();
    else if (id === 'home') store.goHome(villageId);
  } else {
    ui.notifyLocked('仅能在本村（大树楼桑里）营生，或晋升乡长后可赴他村。');
  }
};

// 独立交互系统：悬停村落 → 环形操作盘（点击打开维度详情弹窗 / 人物志 / 个人营生 / 进入村落）
const radial = new RadialMenu(uiRoot, store, view, {
  openDetail: ui.openDetail,
  openHero: ui.openHero,
  openIntel: ui.openIntel,
  personalAction,
});

// 地块 / 房间点击统一处理（L2 村落 / L3 房室）：权限复核 → 执行 / 锁定提示
const runSpot = (villageId: string, action: SpotAction): void => {
  const title = store.state.title;
  const allowed = (a: SpotAction): boolean => {
    if (a.kind === 'personal') {
      if (a.id === 'shrine') return rankValue(title) >= 1 && canManageVillage(title, villageId);
      return villageId === HOME_VILLAGE_ID || rankValue(title) >= 4;
    }
    if (a.kind === 'perm') return canAct(title, a.id) && canManageVillage(title, villageId);
    if (a.kind === 'build') return canAct(title, 'build') && canManageVillage(title, villageId);
    if (a.kind === 'upgrade') return canAct(title, 'upgrade') && canManageVillage(title, villageId);
    if (a.kind === 'enter') return true;
    return false;
  };
  if (!allowed(action)) {
    let msg = '权限不足。';
    if (action.kind === 'perm' || action.kind === 'build' || action.kind === 'upgrade') {
      const needed =
        action.kind === 'perm'
          ? PERM_RANK[action.id]
          : action.kind === 'build'
            ? PERM_RANK['build']
            : PERM_RANK['upgrade'];
      msg = `需晋升至${rankName(needed)}方可经营此间。`;
    } else if (action.kind === 'personal' && action.id === 'shrine') {
      msg = '需晋升里长方可祭祖聚族。';
    } else if (action.kind === 'personal') {
      msg = '仅能在本村（大树楼桑里）营生，或晋升乡长后可赴他村。';
    }
    ui.notifyLocked(msg);
    return;
  }
  switch (action.kind) {
    case 'personal':
      if (action.id === 'weave') store.weave();
      else if (action.id === 'chop') store.chopWood();
      else if (action.id === 'home') store.goHome(villageId);
      else if (action.id === 'shrine') store.visitShrine(villageId);
      break;
    case 'perm':
      if (action.id === 'farm') store.conscriptFarm(villageId);
      else if (action.id === 'pacify') store.pacify(villageId);
      else if (action.id === 'dispute') store.resolveDispute(villageId);
      else if (action.id === 'chief') store.appointChief(villageId);
      else if (action.id === 'trade') ui.notifyLocked('通商需在村落「外交」维度与邻村进行。');
      break;
    case 'build':
      store.build(villageId, action.type);
      break;
    case 'upgrade':
      store.upgrade(villageId);
      break;
    case 'enter':
      view.enterBuilding(action.room);
      break;
    case 'none':
      ui.notifyLocked('此处仅供观览。');
      break;
  }
};
view.onSpotAction = runSpot;

// 地图每次重绘（拖拽/缩放/resize）后，轮盘按最新坐标重新定位，避免漂移
view.onRender = () => radial.reposition();

// 大世界资源点点击 → 弹信息 + 开采（开采由 hud 的 data-action=mine 处理）
view.onResourceClick = (id: string): void => {
  const pt = store.state.resourcePoints.find((p) => p.id === id);
  if (!pt) return;
  const depleted = pt.depleted || pt.stock <= 0;
  openModal(
    `<div class="max-w-sm w-[92%] rounded-2xl bg-slate-800 border border-amber-500/40 shadow-2xl pop-in p-5 text-center">
      <div class="text-4xl mb-2">${pt.emoji}</div>
      <div class="font-bold text-amber-300 text-lg mb-1">${pt.name}</div>
      <p class="text-sm text-slate-300 mb-2">${pt.desc ?? ''}</p>
      <div class="text-[11px] text-slate-400 mb-3">储量 ${pt.stock}/${pt.maxStock}　每回合被动产出 ${pt.yieldPerTurn}</div>
      ${
        depleted
          ? '<div class="text-rose-300 text-sm mb-3">已开采殆尽，静待另辟新脉。</div>'
          : `<button data-action="mine" data-rp="${pt.id}" class="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition">⛏️ 开采（得${pt.yieldPerTurn * 2}）</button>`
      }
      <button data-modal-close class="block mx-auto mt-2 px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm transition">关闭</button>
    </div>`,
  );
};
view.onHover = (id) => {
  if (id) {
    const p = view.screenPos(id);
    if (p) radial.show(id, p[0], p[1]);
  }
  // 悬停到空白不自动收起（避免移向按钮时闪烁）；由空白点击/Esc/选中收起
};
view.onBlank = () => radial.hide();

// 视图订阅状态变更 → 重绘（UI 在 mountUI 内自行订阅）
store.subscribe(() => view.render());
view.render();

// ===== 开发编辑模式（ESC 开关）：测试期现场改位置/人物卡/资源 =====
// 编辑覆盖层：开发模式开启时，界面上带 [data-edit]/[data-edit-img] 的元素可点击直接改
const editOverlay = new EditOverlay(store);
const devPanel = mountDevPanel(uiRoot, store, liubeiRealm, {
  focusVillage,
  setDevDrag: (on) => view.setDevDrag(on),
  onToggle: (open) => editOverlay.setActive(open),
});
// 地图拖拽节点时，实时刷新开发面板坐标输入框
view.onDevMove = (id) => devPanel.refreshCoord(id);

// 应用级 ESC 调度：有弹窗先关弹窗，否则切换开发编辑模式（modal.ts 不再单独监听 ESC）
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (isModalOpen()) {
    closeModal();
    return;
  }
  devPanel.toggle();
});
