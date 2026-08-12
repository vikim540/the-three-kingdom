"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDevStore } from "@/stores/useDevStore";
import { RegionType, REGION_COLORS, Point2D } from "@/types/region";
import { Settings, Plus, Trash2, Copy, Save, CheckCircle, Move } from "lucide-react";

export const DevModeEditor: React.FC = () => {
  const {
    isDevMode,
    regions,
    selectedRegionId,
    drawingType,
    isDrawing,
    currentPoints,
    toggleDevMode,
    setSelectedRegionId,
    setDrawingType,
    setIsDrawing,
    addPoint,
    clearCurrentPoints,
    finishDrawingRegion,
    updateRegionType,
    updateRegionScaleWeight,
    updatePointPosition,
    moveWholeRegion,
    removePointFromRegion,
    deleteRegion,
    duplicateRegion,
    saveRegionsToStorage,
    loadRegionsFromStorage,
  } = useDevStore();

  const [mousePos, setMousePos] = useState<Point2D | null>(null);
  const [activeDraggingPt, setActiveDraggingPt] = useState<{ regionId: string; pointIdx: number } | null>(null);
  const [activeDraggingRegion, setActiveDraggingRegion] = useState<{ regionId: string; startPos: Point2D } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRegionsFromStorage();
  }, [loadRegionsFromStorage]);

  // 快捷鍵 Ctrl + S 保存區域數據
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRegionsToStorage();
        setToastMsg("💾 關卡多邊形區域 JSON 已成功保存！");
        setTimeout(() => setToastMsg(null), 2500);
      }
      if (e.key === "Escape") {
        clearCurrentPoints();
        setActiveDraggingPt(null);
        setActiveDraggingRegion(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveRegionsToStorage, clearCurrentPoints]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDevMode || !containerRef.current) return;
    if (activeDraggingPt || activeDraggingRegion) {
      setActiveDraggingPt(null);
      setActiveDraggingRegion(null);
      saveRegionsToStorage();
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const xRatio = Number(((e.clientX - rect.left) / rect.width).toFixed(3));
    const yRatio = Number(((e.clientY - rect.top) / rect.height).toFixed(3));

    if (isDrawing) {
      addPoint({ x: xRatio, y: yRatio });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setMousePos({ x, y });

    // 拖拽單個頂點
    if (activeDraggingPt) {
      updatePointPosition(
        activeDraggingPt.regionId,
        activeDraggingPt.pointIdx,
        { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) }
      );
    }

    // 拖拽整個多邊形區域位置
    if (activeDraggingRegion) {
      const dx = x - activeDraggingRegion.startPos.x;
      const dy = y - activeDraggingRegion.startPos.y;
      moveWholeRegion(activeDraggingRegion.regionId, dx, dy);
      setActiveDraggingRegion({ regionId: activeDraggingRegion.regionId, startPos: { x, y } });
    }
  };

  const selectedRegion = regions.find((r) => r.id === selectedRegionId);

  return (
    <>
      {/* ─── 右上角常駐開發模式按鈕 ─── */}
      <button
        onClick={toggleDevMode}
        className={`fixed top-4 right-20 z-50 px-3 py-1.5 rounded-xl border-2 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xl backdrop-blur-md ${
          isDevMode
            ? "border-amber-400 bg-amber-950/90 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse"
            : "border-amber-600/50 bg-stone-900/80 text-amber-200 hover:bg-stone-800"
        }`}
      >
        <Settings className={`w-4 h-4 ${isDevMode ? "animate-spin" : ""}`} />
        <span>開發模式 {isDevMode ? "(ON)" : ""}</span>
      </button>

      {/* ─── Ctrl+S 儲存成功 Toast 提示 ─── */}
      {toastMsg && (
        <div className="fixed top-16 right-20 z-50 px-4 py-2 rounded-xl border-2 border-emerald-500 bg-stone-950 text-emerald-300 font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ─── 開發模式多邊形 SVG 編輯層 ─── */}
      {isDevMode && (
        <div
          ref={containerRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={() => {
            if (activeDraggingPt || activeDraggingRegion) {
              setActiveDraggingPt(null);
              setActiveDraggingRegion(null);
              saveRegionsToStorage();
            }
          }}
          className="fixed inset-0 z-40 cursor-crosshair pointer-events-auto select-none"
        >
          <svg className="w-full h-full">
            {/* 已繪製的多邊形區域 */}
            {regions.map((region) => {
              const isSelected = region.id === selectedRegionId;
              const colorConfig = REGION_COLORS[region.type] || REGION_COLORS.ROAD;

              const centerX =
                (region.points.reduce((acc, p) => acc + p.x, 0) / region.points.length) * 100;
              const centerY =
                (region.points.reduce((acc, p) => acc + p.y, 0) / region.points.length) * 100;

              return (
                <g key={region.id}>
                  {/* 多邊形填色區域 (支援整塊拖拽位置) */}
                  <polygon
                    points={region.points.map((p) => `${p.x * 100}%,${p.y * 100}%`).join(" ")}
                    fill={colorConfig.fill}
                    stroke={isSelected ? "#ffffff" : colorConfig.stroke}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={isSelected ? "4 4" : undefined}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedRegionId(region.id);
                      if (mousePos) {
                        setActiveDraggingRegion({ regionId: region.id, startPos: mousePos });
                      }
                    }}
                    className="transition-all hover:opacity-90 cursor-grab active:cursor-grabbing"
                  />

                  {/* 區塊名稱標籤 */}
                  <text
                    x={`${centerX}%`}
                    y={`${centerY}%`}
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                  >
                    {region.name} ({colorConfig.label})
                  </text>

                  {/* 頂點節點 (支援單獨頂點拖拽與右鍵刪除) */}
                  {region.points.map((pt, idx) => {
                    const isDraggingThis =
                      activeDraggingPt?.regionId === region.id && activeDraggingPt?.pointIdx === idx;

                    return (
                      <circle
                        key={idx}
                        cx={`${pt.x * 100}%`}
                        cy={`${pt.y * 100}%`}
                        r={isDraggingThis ? 8 : isSelected ? 6 : 4}
                        fill={isDraggingThis ? "#38bdf8" : isSelected ? "#fbbf24" : colorConfig.stroke}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        className="cursor-move hover:scale-125 transition-transform"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedRegionId(region.id);
                          setActiveDraggingPt({ regionId: region.id, pointIdx: idx });
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removePointFromRegion(region.id, idx);
                        }}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* 正在繪製中的草稿多邊形 */}
            {isDrawing && currentPoints.length > 0 && (
              <g>
                <polyline
                  points={currentPoints.map((p) => `${p.x * 100}%,${p.y * 100}%`).join(" ")}
                  fill="rgba(245, 158, 11, 0.2)"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                />
                {mousePos && (
                  <line
                    x1={`${currentPoints[currentPoints.length - 1].x * 100}%`}
                    y1={`${currentPoints[currentPoints.length - 1].y * 100}%`}
                    x2={`${mousePos.x * 100}%`}
                    y2={`${mousePos.y * 100}%`}
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                  />
                )}
                {currentPoints.map((pt, idx) => (
                  <circle key={idx} cx={`${pt.x * 100}%`} cy={`${pt.y * 100}%`} r={5} fill="#38bdf8" />
                ))}
              </g>
            )}
          </svg>

          {/* ─── 左下角精簡編輯控制面板 ─── */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-6 left-6 z-50 w-84 rounded-2xl border-2 border-amber-600/60 p-4 shadow-2xl backdrop-blur-xl bg-stone-950/95 text-stone-200"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-3">
              <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                <Settings className="w-4 h-4" /> 多邊形區域編輯面板
              </span>
              <button
                onClick={() => {
                  saveRegionsToStorage();
                  setToastMsg("💾 關卡區域 JSON 已保存！");
                  setTimeout(() => setToastMsg(null), 2500);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 transition"
                title="Ctrl + S 快速保存"
              >
                <Save className="w-3 h-3" /> 保存 (Ctrl+S)
              </button>
            </div>

            {/* 繪製新區域類型選擇 */}
            <div className="space-y-2 mb-3">
              <div className="text-[11px] font-semibold text-stone-400">選擇新區域類型：</div>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                {(["ROAD", "AMBUSH", "PLAYER_SPAWN", "ENEMY_SPAWN", "SAFE_ZONE", "AIR_WALL"] as RegionType[]).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setDrawingType(type);
                        setIsDrawing(true);
                      }}
                      className={`p-1.5 rounded-lg border text-center font-bold transition ${
                        drawingType === type && isDrawing
                          ? "border-amber-400 bg-amber-500/30 text-white"
                          : "border-stone-800 bg-stone-900 text-stone-300 hover:border-stone-700"
                      }`}
                    >
                      {REGION_COLORS[type].label}
                    </button>
                  )
                )}
              </div>

              {isDrawing ? (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => finishDrawingRegion()}
                    disabled={currentPoints.length < 3}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50"
                  >
                    完成繪製 ({currentPoints.length}頂點)
                  </button>
                  <button
                    onClick={clearCurrentPoints}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsDrawing(true)}
                  className="w-full py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> 左鍵點擊畫布繪製新多邊形
                </button>
              )}
            </div>

            {/* 選中的區域屬性編輯與刪除 */}
            {selectedRegion ? (
              <div className="border-t border-stone-800 pt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span className="truncate max-w-[170px]">區域：{selectedRegion.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => duplicateRegion(selectedRegion.id)}
                      className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300"
                      title="複製區域"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteRegion(selectedRegion.id)}
                      className="p-1 rounded bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 flex items-center gap-1 px-2 text-[10px]"
                      title="刪除此區域"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 刪除
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-stone-400">類型設定：</span>
                  <select
                    value={selectedRegion.type}
                    onChange={(e) => updateRegionType(selectedRegion.id, e.target.value as RegionType)}
                    className="flex-1 bg-stone-900 border border-stone-700 rounded p-1 text-amber-200 font-bold"
                  >
                    {(["ROAD", "AMBUSH", "PLAYER_SPAWN", "ENEMY_SPAWN", "SAFE_ZONE", "AIR_WALL"] as RegionType[]).map((t) => (
                      <option key={t} value={t}>
                        {REGION_COLORS[t].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-stone-400 mb-1">
                    <span>透視縮放權重：</span>
                    <span className="text-amber-300 font-mono font-bold">
                      {selectedRegion.scaleWeight || 0.8}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="1.5"
                    step="0.05"
                    value={selectedRegion.scaleWeight || 0.8}
                    onChange={(e) => updateRegionScaleWeight(selectedRegion.id, parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="text-[10px] text-stone-400 pt-1 leading-relaxed flex items-center gap-1">
                  <Move className="w-3 h-3 text-amber-400" />
                  <span>按住多邊形內即可拖拽整體位置；拖動圓點可修改頂點。</span>
                </div>
              </div>
            ) : (
              <div className="border-t border-stone-800 pt-2 text-[11px] text-stone-500 text-center">
                點擊多邊形可進行位移拖拽、屬性與刪除操作
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
