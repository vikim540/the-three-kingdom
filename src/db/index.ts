import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL || "file:sqlite.db";

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof createClient> | undefined;
  initialized: boolean;
};

export const client = globalForDb.client ?? createClient({ url: dbUrl });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });

// 自動建立資料庫 Schema 表（防止 no such table 錯誤）
export async function ensureDbInitialized() {
  if (globalForDb.initialized) return;
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '穿越修士',
        realm TEXT NOT NULL DEFAULT '煉氣期一層',
        spirit_stones INTEGER NOT NULL DEFAULT 100,
        created_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS save_files (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        selected_hero_id TEXT,
        stage_id TEXT NOT NULL DEFAULT 'stage_1_bandit',
        story_step TEXT NOT NULL DEFAULT 'INTRO',
        game_data_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS unlocked_heroes (
        id TEXT PRIMARY KEY,
        save_id TEXT NOT NULL,
        hero_id TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        exp INTEGER NOT NULL DEFAULT 0,
        acquired_at TEXT NOT NULL
      );
    `);
    globalForDb.initialized = true;
  } catch (err) {
    console.error("初始化資料庫 Schema 失敗:", err);
  }
}
