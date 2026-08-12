"use client";

import React, { useEffect, useState } from "react";
import {
  useInventoryStore,
  Item,
  EquipSlot,
  ItemQuality,
} from "@/stores/useInventoryStore";
import { PROTAGONIST_HERO, SUMMONABLE_HEROES } from "@/game/config/heroes";
import { X, ArrowUp, ArrowDown, RefreshCw, ArrowDownLeft } from "lucide-react";

export const InventoryModal: React.FC = () => {
  const {
    spiritStones,
    heroSouls,
    isOpenB,
    isOpenTab,
    activeHeroId,
    heroInventories,
    toggleB,
    toggleTab,
    closeAll,
    setActiveHeroId,
    equipItemForHero,
    unequipSlotForHero,
    consumeItemForHero,
    transferItemBetweenHeroes,
    quickSortHeroBackpack,
    unequipAllForHero,
  } = useInventoryStore();

  const [hoveredItem, setHoveredItem] = useState<{ item: Item; slot?: EquipSlot } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ item: Item; heroId: string; idx?: number; slot?: EquipSlot; x: number; y: number } | null>(null);
  const [draggedSource, setDraggedSource] = useState<{ heroId: string; type: "backpack" | "equipment"; key: number | EquipSlot } | null>(null);

  // 監聽 B 鍵與 TAB 鍵與 Esc 鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleB();
      } else if (e.key === "Tab") {
        e.preventDefault();
        toggleTab();
      } else if (e.key === "Escape") {
        closeAll();
        setContextMenu(null);
        setHoveredItem(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleB, toggleTab, closeAll]);

  if (!isOpenB && !isOpenTab) return null;

  const allHeroes = [PROTAGONIST_HERO, ...SUMMONABLE_HEROES];
  const currentHero = allHeroes.find((h) => h.id === activeHeroId) || PROTAGONIST_HERO;
  const currentInv = heroInventories[activeHeroId] || {
    equipment: { WEAPON: null, ARMOR: null, ACCESSORY: null, ART: null },
    backpack: Array(20).fill(null),
  };

  const qualityBorders: Record<ItemQuality, { border: string; text: string; bg: string }> = {
    仙: { border: "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]", text: "text-amber-300", bg: "bg-amber-950/40" },
    帝: { border: "border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]", text: "text-purple-300", bg: "bg-purple-950/40" },
    王: { border: "border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]", text: "text-blue-300", bg: "bg-blue-950/40" },
    靈: { border: "border-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.5)]", text: "text-emerald-300", bg: "bg-emerald-950/40" },
    凡: { border: "border-slate-500", text: "text-slate-300", bg: "bg-slate-900/40" },
  };

  // Tooltip 裝備數值差異比較計算
  const renderStatComparison = (item: Item) => {
    if (!["WEAPON", "ARMOR", "ACCESSORY", "ART"].includes(item.type)) return null;
    const slot = item.type as EquipSlot;
    const equipped = currentInv.equipment[slot];
    const targetStats = item.stats || {};
    const currentStats = equipped?.stats || {};

    const statKeys: (keyof typeof targetStats)[] = ["atk", "def", "hp", "speed", "moveRange"];
    const statLabels: Record<string, string> = {
      atk: "攻擊力 (ATK)",
      def: "防禦力 (DEF)",
      hp: "生命值 (HP)",
      speed: "速度 (SPEED)",
      moveRange: "移動力 (MOVE)",
    };

    return (
      <div className="mt-2 pt-2 border-t border-stone-800 space-y-1 text-xs">
        <div className="text-[10px] font-bold text-amber-400 mb-1">
          📊 與當前裝備【{equipped ? equipped.name : "未裝備"}】對比：
        </div>
        {statKeys.map((key) => {
          const val = targetStats[key] || 0;
          const currVal = currentStats[key] || 0;
          const diff = val - currVal;

          if (val === 0 && currVal === 0) return null;

          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-stone-400">{statLabels[key]}</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-stone-200">{val}</span>
                {diff > 0 && (
                  <span className="text-emerald-400 text-[11px] flex items-center">
                    <ArrowUp className="w-3 h-3" /> (+{diff})
                  </span>
                )}
                {diff < 0 && (
                  <span className="text-red-400 text-[11px] flex items-center">
                    <ArrowDown className="w-3 h-3" /> ({diff})
                  </span>
                )}
                {diff === 0 && <span className="text-stone-500 text-[11px]">(持平)</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      onClick={() => setContextMenu(null)}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/88 backdrop-blur-xl animate-fade-in select-none"
    >
      {/* ─── 博德之門 3 主面板 ─── */}
      <div className="relative max-w-5xl w-full rounded-2xl border-2 border-amber-600/60 bg-stone-950/95 shadow-[0_0_60px_rgba(245,158,11,0.35)] p-6 text-stone-200 flex flex-col max-h-[92vh]">

        {/* ─── TAB 模式頂部：全隊角色頭像橫向切換欄 ─── */}
        {isOpenTab && (
          <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
            <div className="flex items-center gap-3 overflow-x-auto py-1">
              {allHeroes.map((hero) => {
                const isSelected = activeHeroId === hero.id;
                return (
                  <div
                    key={hero.id}
                    onClick={() => setActiveHeroId(hero.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedSource && draggedSource.heroId !== hero.id) {
                        transferItemBetweenHeroes(
                          draggedSource.heroId,
                          draggedSource.type,
                          draggedSource.key,
                          hero.id,
                          "backpack"
                        );
                        setDraggedSource(null);
                      }
                    }}
                    className={`group relative flex flex-col items-center gap-1 cursor-pointer transition p-1.5 rounded-xl border-2 ${
                      isSelected
                        ? "border-amber-400 bg-amber-500/20 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                        : "border-stone-800 bg-stone-900/60 hover:border-stone-700"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-stone-700 relative">
                      {/* eslint-disable-next-html-element-fallback */}
                      <img
                        src={hero.imagePath}
                        alt={hero.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-amber-200 font-serif-title">
                      {hero.name}
                    </span>
                    {/* 血條狀態 */}
                    <div className="w-10 h-1 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                      <div className="h-full bg-emerald-400 w-full" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 一鍵快捷功能 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => quickSortHeroBackpack(activeHeroId)}
                className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-bold text-amber-300 flex items-center gap-1 transition"
                title="自動整理當前背包"
              >
                <RefreshCw className="w-3.5 h-3.5" /> 快速整理
              </button>
              <button
                onClick={() => unequipAllForHero(activeHeroId)}
                className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-bold text-red-300 flex items-center gap-1 transition"
                title="一鍵卸下全部裝備"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" /> 全部卸下
              </button>
            </div>
          </div>
        )}

        {/* ─── 標題欄 (B 模式) ─── */}
        {isOpenB && (
          <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
            <h2 className="text-xl font-black font-serif-title text-amber-300 tracking-wider flex items-center gap-2">
              <span>🎒 {currentHero.name} • 個人背包與裝備 (B)</span>
            </h2>

            <div className="flex items-center gap-3">
              <button
                onClick={() => quickSortHeroBackpack(activeHeroId)}
                className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-bold text-amber-300 flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> 快速整理
              </button>
              <button
                onClick={closeAll}
                className="p-1.5 rounded-lg border border-stone-700 hover:border-amber-400 text-stone-400 hover:text-amber-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ─── 由左至右三欄佈局 ─── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 overflow-y-auto pr-1">

          {/* 1. 左欄：角色資訊區 */}
          <div className="md:col-span-4 rounded-xl border border-stone-800 bg-stone-900/50 p-4 flex flex-col items-center">
            {/* 角色大頭像立繪 */}
            <div className="w-36 h-48 rounded-xl border-2 border-amber-500/60 overflow-hidden bg-stone-950 mb-3 shadow-xl relative">
              {/* eslint-disable-next-html-element-fallback */}
              <img
                src={currentHero.imagePath}
                alt={currentHero.name}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute bottom-0 inset-x-0 py-1 bg-stone-950/85 text-center text-xs font-bold text-amber-300 font-serif-title">
                {currentHero.name} • {currentHero.title}
              </div>
            </div>

            {/* 屬性條 (顏色區分) */}
            <div className="w-full space-y-2 text-xs font-bold">
              <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-800">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  生命值 (HP)
                </span>
                <span className="text-emerald-400 font-mono">{currentHero.baseStats.hp}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-800">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  攻擊力 (ATK)
                </span>
                <span className="text-amber-400 font-mono">{currentHero.baseStats.atk}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-800">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  防禦力 (DEF)
                </span>
                <span className="text-sky-400 font-mono">{currentHero.baseStats.def}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-stone-950 border border-stone-800">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  移動/射程
                </span>
                <span className="text-purple-400 font-mono">
                  {currentHero.baseStats.moveRange}格 / {currentHero.baseStats.attackRange}距離
                </span>
              </div>
            </div>

            {/* 底部共用資源 */}
            <div className="w-full mt-4 pt-3 border-t border-stone-800 flex items-center justify-around text-xs font-bold">
              <span className="text-amber-300 flex items-center gap-1">💰 靈石：{spiritStones}</span>
              <span className="text-purple-300 flex items-center gap-1">✨ 將魂：{heroSouls}</span>
            </div>
          </div>

          {/* 2. 中欄：裝備與修仙功法槽 (紙娃娃區) */}
          <div className="md:col-span-3 rounded-xl border border-stone-800 bg-stone-900/50 p-4 flex flex-col justify-between">
            <div className="text-xs font-bold text-amber-400 border-b border-stone-800 pb-2 mb-3 flex items-center justify-between">
              <span>⚔️ 裝備與功法</span>
              <span className="text-[10px] text-stone-500">拖拽或點擊卸下</span>
            </div>

            <div className="space-y-3">
              {[
                { slot: "WEAPON" as const, label: "武器 (主手)", icon: "⚔️" },
                { slot: "ARMOR" as const, label: "防具", icon: "🛡️" },
                { slot: "ACCESSORY" as const, label: "飾品", icon: "💍" },
                { slot: "ART" as const, label: "修仙功法", icon: "📜" },
              ].map(({ slot, label, icon }) => {
                const item = currentInv.equipment[slot];
                const qc = item ? qualityBorders[item.quality] : null;

                return (
                  <div
                    key={slot}
                    draggable={!!item}
                    onDragStart={() => setDraggedSource({ heroId: activeHeroId, type: "equipment", key: slot })}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedSource) {
                        transferItemBetweenHeroes(
                          draggedSource.heroId,
                          draggedSource.type,
                          draggedSource.key,
                          activeHeroId,
                          "equipment",
                          slot
                        );
                        setDraggedSource(null);
                      }
                    }}
                    onMouseEnter={() => item && setHoveredItem({ item, slot })}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => item && unequipSlotForHero(activeHeroId, slot)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (item) setContextMenu({ item, heroId: activeHeroId, slot, x: e.clientX, y: e.clientY });
                    }}
                    className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition ${
                      item
                        ? `${qc?.border} ${qc?.bg}`
                        : "border-dashed border-stone-800 bg-stone-950/70 text-stone-600 hover:border-stone-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{item ? item.icon : icon}</span>
                      <div>
                        <div className={`text-xs font-bold ${item ? qc?.text : "text-stone-500"}`}>
                          {item ? item.name : label}
                        </div>
                        {item?.stats && (
                          <div className="text-[10px] text-amber-300 mt-0.5">
                            {item.stats.atk ? `ATK +${item.stats.atk}` : ""}
                            {item.stats.def ? ` DEF +${item.stats.def}` : ""}
                          </div>
                        )}
                      </div>
                    </div>
                    {item && <span className="text-[10px] text-red-400 font-bold">卸下</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. 右欄：物品背包 (4x5 可滾動網格) */}
          <div className="md:col-span-5 rounded-xl border border-stone-800 bg-stone-900/50 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400 border-b border-stone-800 pb-2 mb-3">
              <span>🎒 物品背包 (4x5)</span>
              <span className="text-[10px] text-stone-500">右鍵菜單 / 可跨角色拖拽</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {currentInv.backpack.slice(0, 20).map((item, idx) => {
                const qc = item ? qualityBorders[item.quality] : null;

                return (
                  <div
                    key={idx}
                    draggable={!!item}
                    onDragStart={() => setDraggedSource({ heroId: activeHeroId, type: "backpack", key: idx })}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedSource) {
                        transferItemBetweenHeroes(
                          draggedSource.heroId,
                          draggedSource.type,
                          draggedSource.key,
                          activeHeroId,
                          "backpack",
                          idx
                        );
                        setDraggedSource(null);
                      }
                    }}
                    onMouseEnter={() => item && setHoveredItem({ item })}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => item && equipItemForHero(activeHeroId, item, idx)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (item) setContextMenu({ item, heroId: activeHeroId, idx, x: e.clientX, y: e.clientY });
                    }}
                    className={`h-16 rounded-xl border-2 p-1.5 flex flex-col items-center justify-center relative cursor-pointer transition hover:scale-105 ${
                      item
                        ? `${qc?.border} ${qc?.bg}`
                        : "border-stone-800/60 bg-stone-950/60 hover:border-stone-700"
                    }`}
                  >
                    {item ? (
                      <>
                        <span className="text-2xl">{item.icon}</span>
                        <span className={`text-[10px] font-bold text-center leading-none mt-1 truncate w-full ${qc?.text}`}>
                          {item.name}
                        </span>
                        {item.stackCount && item.stackCount > 1 && (
                          <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-stone-950/90 text-amber-300 text-[9px] font-mono font-bold">
                            x{item.stackCount}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-stone-800 text-xs font-bold">+</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── 懸停 Tooltip (與當前裝備數值對比) ─── */}
        {hoveredItem && (
          <div
            className="fixed bottom-8 right-8 z-50 w-72 rounded-xl border-2 border-amber-500/80 bg-stone-950/95 p-4 shadow-2xl backdrop-blur-md text-stone-200 pointer-events-none"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-2">
              <span className={`text-sm font-bold font-serif-title ${qualityBorders[hoveredItem.item.quality].text}`}>
                {hoveredItem.item.icon} {hoveredItem.item.name}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {hoveredItem.item.quality}階
              </span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed mb-2">
              {hoveredItem.item.description}
            </p>

            {/* 數值比較列表 */}
            {renderStatComparison(hoveredItem.item)}
          </div>
        )}

        {/* ─── 右鍵操作選單 ─── */}
        {contextMenu && (
          <div
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className="fixed z-50 w-40 rounded-xl border-2 border-amber-500/60 bg-stone-950 p-1 shadow-2xl text-xs font-bold text-stone-200 animate-fade-in"
          >
            {["WEAPON", "ARMOR", "ACCESSORY", "ART"].includes(contextMenu.item.type) && (
              <button
                onClick={() => {
                  equipItemForHero(contextMenu.heroId, contextMenu.item, contextMenu.idx);
                  setContextMenu(null);
                }}
                className="w-full p-2 text-left hover:bg-amber-500/20 text-amber-300 rounded flex items-center gap-2"
              >
                ⚔️ 裝備此物品
              </button>
            )}
            {contextMenu.item.type === "POTION" && (
              <button
                onClick={() => {
                  consumeItemForHero(contextMenu.heroId, contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full p-2 text-left hover:bg-emerald-500/20 text-emerald-300 rounded flex items-center gap-2"
              >
                🧪 服用修仙丹
              </button>
            )}
            <button
              onClick={() => {
                if (contextMenu.slot) unequipSlotForHero(contextMenu.heroId, contextMenu.slot);
                setContextMenu(null);
              }}
              className="w-full p-2 text-left hover:bg-stone-800 text-stone-300 rounded flex items-center gap-2"
            >
              📥 移至背包
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
