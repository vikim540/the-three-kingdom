import * as Phaser from "phaser";

// 用於 Phaser Scene 與 React 全局 UI 解耦的 EventEmitter 單例
export const EventBus = new Phaser.Events.EventEmitter();

export const GAME_EVENTS = {
  // Scene -> React UI
  SCENE_READY: "scene-ready",
  UNIT_SELECTED: "unit-selected",
  UNIT_HOVER: "unit-hover",
  UNIT_OUT: "unit-out",
  ACTION_EXECUTED: "action-executed",
  
  // React UI -> Scene
  REQUEST_MOVE: "request-move",
  REQUEST_ACTION: "request-action",
  HIGHLIGHT_TILES: "highlight-tiles",
  CLEAR_HIGHLIGHT: "clear-highlight",
} as const;
