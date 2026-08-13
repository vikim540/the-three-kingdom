import { NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/db";
import { saveFiles, players, unlockedHeroes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/id";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDbInitialized();
    const saves = await db.select().from(saveFiles).limit(1);
    if (saves.length === 0) {
      return NextResponse.json({ success: true, save: null, gameData: {} });
    }
    const save = saves[0];
    let gameData = {};
    if (save && save.gameDataJson) {
      try {
        gameData = JSON.parse(save.gameDataJson);
      } catch (err) {
        console.warn("存檔 gameDataJson 解析異常，使用預設空物件:", err);
        gameData = {};
      }
    }
    return NextResponse.json({ success: true, save, gameData });
  } catch (error) {
    console.error("Failed to load save:", error);
    // 即使資料庫讀取異常，亦傳回 safe response，避免前端拋出 500 崩潰
    return NextResponse.json({ success: true, save: null, gameData: {}, warning: "資料庫尚未就緒" });
  }
}

export async function POST(req: Request) {
  try {
    await ensureDbInitialized();
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const selectedHeroId = typeof body.selectedHeroId === "string" ? body.selectedHeroId : undefined;
    const storyStep = typeof body.storyStep === "string" ? body.storyStep : undefined;
    const gameData = body.gameData;

    const saves = await db.select().from(saveFiles).limit(1);
    const now = new Date().toISOString();

    if (saves.length === 0) {
      // 建立預設 Player
      const playerId = generateId();
      await db.insert(players).values({
        id: playerId,
        name: "靈宵天尊",
        realm: "煉氣期一層",
        spiritStones: 100,
        createdAt: now,
      });

      const saveId = generateId();
      await db.insert(saveFiles).values({
        id: saveId,
        playerId,
        selectedHeroId: selectedHeroId || null,
        stageId: "stage_1_bandit",
        storyStep: storyStep || "INTRO",
        gameDataJson: JSON.stringify(gameData || {}),
        updatedAt: now,
      });

      if (selectedHeroId) {
        await db.insert(unlockedHeroes).values({
          id: generateId(),
          saveId,
          heroId: selectedHeroId,
          level: 1,
          exp: 0,
          acquiredAt: now,
        });
      }

      return NextResponse.json({ success: true, saveId });
    } else {
      const existingSave = saves[0];
      await db
        .update(saveFiles)
        .set({
          selectedHeroId: selectedHeroId || existingSave.selectedHeroId,
          storyStep: storyStep || existingSave.storyStep,
          gameDataJson: JSON.stringify(gameData || {}),
          updatedAt: now,
        })
        .where(eq(saveFiles.id, existingSave.id));

      if (selectedHeroId && selectedHeroId !== existingSave.selectedHeroId) {
        await db.insert(unlockedHeroes).values({
          id: generateId(),
          saveId: existingSave.id,
          heroId: selectedHeroId,
          level: 1,
          exp: 0,
          acquiredAt: now,
        });
      }

      return NextResponse.json({ success: true, saveId: existingSave.id });
    }
  } catch (error) {
    console.error("Failed to update save:", error);
    return NextResponse.json({ success: false, error: "無法寫入存檔" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await ensureDbInitialized();
    await db.delete(saveFiles);
    await db.delete(unlockedHeroes);
    return NextResponse.json({ success: true, message: "存檔已重置" });
  } catch (error) {
    console.error("Failed to delete save:", error);
    return NextResponse.json({ success: false, error: "無法重置存檔" }, { status: 500 });
  }
}
