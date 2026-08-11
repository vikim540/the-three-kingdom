// ===== 编辑覆盖层（点击即改，开发作者模式）=====
// 仅当开发模式（ESC 开启）激活时生效：直接点击界面上带 [data-edit]（文字/数值）
// 或 [data-edit-img]（立绘/卡面/背景）的元素，即写回 store.setDevOverride(path, value)，
// 落入与玩家存档分离的独立 devOverrides 层（独立 localStorage 键，可一键导出）。
// 不触碰任何游戏规则；关闭开发模式即停止拦截，界面恢复原样。
import type { GameStore } from '../sim/store';
import { getByPath } from '../sim/path';

export class EditOverlay {
  private on = false;

  constructor(private store: GameStore) {
    // 捕获阶段优先拦截，避免点击编辑元素时误触发 HUD 的 data-action 行为
    document.addEventListener('click', this.onClick, true);
  }

  // 由开发面板 toggle 时联动开启/关闭（main.ts 接线）
  setActive(on: boolean): void {
    if (this.on === on) return;
    this.on = on;
    document.body.classList.toggle('dev-edit-on', on);
  }
  isActive(): boolean {
    return this.on;
  }

  private onClick = (e: MouseEvent): void => {
    if (!this.on) return;
    const target = e.target as HTMLElement;

    // 1) 图片类（立绘/卡面/背景）：弹出文件选择，转 dataURL 写回
    const imgEl = target.closest('[data-edit-img]') as HTMLElement | null;
    if (imgEl) {
      e.preventDefault();
      e.stopPropagation();
      this.editImage(imgEl.getAttribute('data-edit-img')!);
      return;
    }

    // 2) 文字/数值类：以当前 state 原始值预填，回写路径
    const el = target.closest('[data-edit]') as HTMLElement | null;
    if (el) {
      e.preventDefault();
      e.stopPropagation();
      this.editText(el.getAttribute('data-edit')!);
      return;
    }
  };

  private editText(path: string): void {
    const cur = getByPath(this.store.state, path);
    const input = window.prompt(`编辑开发覆盖\n路径：${path}\n（数值自动解析，其余按文本）`, cur == null ? '' : String(cur));
    if (input === null) return; // 取消
    const trimmed = input.trim();
    const isNum = trimmed !== '' && /^-?\d+(\.\d+)?$/.test(trimmed);
    this.store.setDevOverride(path, isNum ? Number(trimmed) : input);
  }

  private editImage(path: string): void {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.store.setDevOverride(path, reader.result as string);
        window.dispatchEvent(new Event('resize')); // 背景图变更需触发地图重绘
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  }
}
