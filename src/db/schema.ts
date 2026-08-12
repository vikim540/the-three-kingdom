import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// 玩家主要檔案
export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default("穿越修士"),
  realm: text("realm").notNull().default("煉氣期一層"),
  spiritStones: integer("spirit_stones").notNull().default(100),
  createdAt: text("created_at").notNull(),
});

// 存檔記錄
export const saveFiles = sqliteTable("save_files", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull(),
  selectedHeroId: text("selected_hero_id"),
  stageId: text("stage_id").notNull().default("stage_1_bandit"),
  storyStep: text("story_step").notNull().default("INTRO"), // INTRO -> SUMMON -> BATTLE -> COMPLETED
  gameDataJson: text("game_data_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 玩家名將紀錄
export const unlockedHeroes = sqliteTable("unlocked_heroes", {
  id: text("id").primaryKey(),
  saveId: text("save_id").notNull(),
  heroId: text("hero_id").notNull(),
  level: integer("level").notNull().default(1),
  exp: integer("exp").notNull().default(0),
  acquiredAt: text("acquired_at").notNull(),
});
