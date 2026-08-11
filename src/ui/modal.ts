// ===== 全局唯一弹窗容器（消除多套 overlay 重复基建）=====
// 所有弹窗（维度详情 / 人物志 / 建造选择器）共用同一 overlay：
//   背景遮罩 + 居中卡 + 关闭按钮(data-modal-close) + Esc + 点遮罩关闭。
// 层级 z-[70]，高于入局背景板(#intro z-50)，满足 agents.md §2.4-3。
// 业务侧只负责「卡内 HTML + 事件绑定」，遮罩/层级/Esc/关闭全部集中在此。

let overlay: HTMLDivElement | null = null;
let currentOnClose: (() => void) | null = null;
let currentDismissable = true; // 不可关闭的弹窗（败北/强制事件）不被 Esc/点遮罩关

function ensureOverlay(): HTMLDivElement {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className =
    'modal-overlay fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur fade-in pointer-events-auto';
  // 仅当点到遮罩本身（而非卡内元素）才关闭，等价于旧的「stopModal/stoppicker」
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && currentDismissable) closeModal();
  });
  document.body.appendChild(overlay);
  return overlay;
}

export interface ModalHandle {
  close: () => void;
  /** 弹窗内容根节点，业务侧用于 querySelector 绑定事件 */
  root: HTMLDivElement;
}

// 打开弹窗：html 为「居中卡片」HTML（不含遮罩，遮罩由本模块统一提供）。
// 卡内任何带 data-modal-close 的元素都会绑定关闭行为。
export function openModal(html: string, opts?: { onClose?: () => void; dismissable?: boolean }): ModalHandle {
  const ov = ensureOverlay();
  currentOnClose = opts?.onClose ?? null;
  currentDismissable = opts?.dismissable ?? true;
  ov.innerHTML = html;
  ov.querySelectorAll<HTMLElement>('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', () => closeModal());
  });
  ov.style.display = 'flex';
  return { close: closeModal, root: ov };
}

export function closeModal(): void {
  if (!currentDismissable) return; // 不可关闭弹窗（败北/强制事件）不受 Esc/点遮罩影响
  if (!overlay || overlay.style.display === 'none') return;
  overlay.style.display = 'none';
  overlay.innerHTML = '';
  const cb = currentOnClose;
  currentOnClose = null;
  if (cb) cb();
}

// 当前是否有弹窗打开（供应用级 ESC 调度：先关弹窗，再切换开发模式）
export function isModalOpen(): boolean {
  return !!overlay && overlay.style.display !== 'none';
}
