"use client";

import React, { useEffect, useState } from "react";
import { useInventoryStore, Item } from "@/stores/useInventoryStore";
import { SUMMONABLE_HEROES, PROTAGONIST_HERO } from "@/game/config/heroes";
import { X } from "lucide-react";

export const InventoryModal: React.FC = () => {
  const {
    spiritStones,
    heroSouls,
    isOpenB,
    isOpenTab,
    activeHeroId,
    backpack,
    equipment,
    toggleB,
    toggleTab,
    closeAll,
    setActiveHeroId,
    equipItem,
    unequipSlot,
    consumeItem,
  } = useInventoryStore();

  const [contextMenu, setContextMenu] = useState<{ item: Item; x: number; y: number } | null>(null);

  // 監聽 B 鍵與 TAB 鍵
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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleB, toggleTab, closeAll]);

  if (!isOpenB && !isOpenTab) return null;

  const allHeroes = [PROTAGONIST_HERO, ...SUMMONABLE_HEROES];
  const currentHero = allHeroes.find((h) => h.id === activeHeroId) || PROTAGONIST_HERO;

  const qualityColors: Record<string, string> = {
    仙: "border-amber-400 text-amber-300 bg-amber-950/40",
    帝: "border-purple-400 text-purple-300 bg-purple-950/40",
    王: "border-blue-400 text-blue-300 bg-blue-950/40",
    靈: "border-emerald-400 text-emerald-300 bg-emerald-950/40",
    凡: "border-slate-500 text-slate-300 bg-slate-900/40",
  };

  return (
    <div
      onClick={() => setContextMenu(null)}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in select-none"
    >
      {/* 面板外框 (博德之門3 深色暗金風格) */}
      <div className="relative max-w-4xl w-full rounded-2xl border-2 border-amber-600/50 bg-stone-950/95 shadow-[0_0_50px_rgba(245,158,11,0.3)] p-6 text-stone-200">

        {/* 頂部標題與分頁按鈕 */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-5">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black font-serif-title text-amber-300 tracking-wider flex items-center gap-2">
              <span>🎒 {isOpenB ? "主角個人背包與裝備 (B)" : "全隊儲物與物品欄 (TAB)"}</span>
            </h2>

            {/* TAB 全隊切換按鈕 */}
            {isOpenTab && (
              <div className="flex gap-1.5 ml-4">
                {allHeroes.map((hero) => (
                  <button
                    key={hero.id}
                    onClick={() => setActiveHeroId(hero.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                      activeHeroId === hero.id
                        ? "border-amber-400 bg-amber-500/20 text-amber-300"
                        : "border-stone-800 bg-stone-900 text-stone-400 hover:border-stone-700"
                    }`}
                  >
                    {hero.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={closeAll}
            className="p-1.5 rounded-lg border border-stone-700 hover:border-amber-400 text-stone-400 hover:text-amber-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* ─── 左側：角色立繪與屬性面板 ─── */}
          <div className="md:col-span-4 rounded-xl border border-stone-800 bg-stone-900/60 p-4 flex flex-col items-center">
            <div className="w-32 h-44 rounded-xl border-2 border-amber-500/40 overflow-hidden bg-stone-950 mb-3 relative shadow-lg">
              {/* eslint-disable-next-html-element-fallback */}
              <img
                src={currentHero.imagePath}
                alt={currentHero.name}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute bottom-0 inset-x-0 py-1 bg-stone-950/80 text-center text-xs font-bold text-amber-300 font-serif-title">
                {currentHero.name} • {currentHero.title}
              </div>
            </div>

            {/* 屬性數據 */}
            <div className="w-full space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-stone-950 border border-stone-800">
                <span className="text-stone-400">生命值 (HP)</span>
                <span className="text-emerald-400 font-bold">{currentHero.baseStats.hp}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-stone-950 border border-stone-800">
                <span className="text-stone-400">攻擊力 (ATK)</span>
                <span className="text-amber-400 font-bold">{currentHero.baseStats.atk}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-stone-950 border border-stone-800">
                <span className="text-stone-400">防禦力 (DEF)</span>
                <span className="text-sky-400 font-bold">{currentHero.baseStats.def}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-stone-950 border border-stone-800">
                <span className="text-stone-400">移動力 / 射程</span>
                <span className="text-purple-400 font-bold">
                  {currentHero.baseStats.moveRange}格 / {currentHero.baseStats.attackRange}距離
                </span>
              </div>
            </div>
          </div>

          {/* ─── 中間：4大裝備槽 ─── */}
          <div className="md:col-span-3 rounded-xl border border-stone-800 bg-stone-900/60 p-4 flex flex-col justify-between">
            <div className="text-xs font-bold text-amber-400 border-b border-stone-800 pb-2 mb-3">
              ⚔️ 裝備與功法槽
            </div>

            <div className="space-y-3">
              {[
                { slot: "WEAPON" as const, label: "武器", icon: "⚔️" },
                { slot: "ARMOR" as const, label: "防具", icon: "🛡️" },
                { slot: "ACCESSORY" as const, label: "飾品", icon: "💍" },
                { slot: "ART" as const, label: "修仙功法", icon: "📜" },
              ].map(({ slot, label, icon }) => {
                const item = equipment[slot];
                return (
                  <div
                    key={slot}
                    onClick={() => item && unequipSlot(slot)}
                    className={`p-2.5 rounded-xl border-2 flex items-center justify-between cursor-pointer transition ${
                      item
                        ? qualityColors[item.quality] || "border-amber-500 bg-stone-900"
                        : "border-dashed border-stone-800 bg-stone-950/60 text-stone-600 hover:border-stone-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item ? item.icon : icon}</span>
                      <div>
                        <div className="text-xs font-bold">
                          {item ? item.name : `未裝備${label}`}
                        </div>
                        {item?.stats && (
                          <div className="text-[10px] text-amber-300">
                            {item.stats.atk ? `ATK +${item.stats.atk}` : ""}
                          </div>
                        )}
                      </div>
                    </div>
                    {item && <span className="text-[10px] text-red-400">卸下</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── 右側：4x5 背包格子 ─── */}
          <div className="md:col-span-5 rounded-xl border border-stone-800 bg-stone-900/60 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400 border-b border-stone-800 pb-2 mb-3">
              <span>🎒 物品背包 (4x5)</span>
              <span className="text-[10px] text-stone-500">右鍵可裝備/使用</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {backpack.slice(0, 20).map((item, idx) => (
                <div
                  key={idx}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (item) setContextMenu({ item, x: e.clientX, y: e.clientY });
                  }}
                  className={`h-16 rounded-xl border-2 p-1 flex flex-col items-center justify-center relative cursor-pointer transition hover:scale-105 ${
                    item
                      ? qualityColors[item.quality] || "border-stone-700 bg-stone-900"
                      : "border-stone-800/60 bg-stone-950/50"
                  }`}
                >
                  {item ? (
                    <>
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-[10px] font-bold text-center leading-none mt-1 truncate w-full">
                        {item.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-stone-800 text-xs">+</span>
                  )}
                </div>
              ))}
            </div>

            {/* 貨幣顯示 */}
            <div className="flex items-center justify-around mt-4 pt-3 border-t border-stone-800 text-xs font-bold">
              <span className="text-amber-300 flex items-center gap-1">
                💰 靈石：{spiritStones}
              </span>
              <span className="text-purple-300 flex items-center gap-1">
                ✨ 將魂：{heroSouls}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 右鍵功能選單 */}
      {contextMenu && (
        <div
          style={{ left: contextMenu.x, top: contextMenu.y }}
          className="fixed z-50 w-36 rounded-xl border border-amber-500/50 bg-stone-950 p-1 shadow-2xl text-xs font-bold text-stone-200"
        >
          <button
            onClick={() => {
              equipItem(contextMenu.item);
              setContextMenu(null);
            }}
            className="w-full p-2 text-left hover:bg-amber-500/20 text-amber-300 rounded"
          >
            ⚔️ 裝備此物品
          </button>
          <button
            onClick={() => {
              consumeItem(contextMenu.item);
              setContextMenu(null);
            }}
            className="w-full p-2 text-left hover:bg-emerald-500/20 text-emerald-300 rounded"
          >
            🧪 使用 / 服用
          </button>
        </div>
      )}
    </div>
  );
};
