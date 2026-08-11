-- ============================================================================
-- sankingdom · 存档数据表结构（DDL 契约）
-- ----------------------------------------------------------------------------
-- 规范来源：agents.md §2.5（数据库硬性规范）
-- 设计原则：
--   1. 语法严格标准 SQL，禁用 SQLite 专有函数/语法（如 AUTOINCREMENT、
--      PRAGMA、日期函数 datetime() 等），保证后续可无缝迁移 PostgreSQL。
--   2. 数值阈值 / 建筑参数 / 升级条件等**不落单条记录**，统一由应用层全局
--      配置（src/data/types.ts 的 TIER_PLOTS / BUILD_INFO / LEVEL_REQ 等）
--      提供，本文件只存「运行时可变状态」与「内容配置」。
--   3. 自增主键统一用 `INTEGER PRIMARY KEY`（SQLite 隐式 rowid 自增；PG 侧
--      迁移时改为 `SERIAL`/`GENERATED ALWAYS AS IDENTITY`，字段名不变）。
--   4. 复杂业务结构（奇遇分支树、整局存档快照）用 TEXT 存 JSON，规避双方
--      JSON 类型的方言差异，应用层序列化/反序列化。
-- ============================================================================

-- ===== 1. 聚落表（villages）：运行时可变状态 =====
-- 静态内容（名称/地形/坐标/特产）由剧本重建；此处只存会变化的经营数据。
CREATE TABLE IF NOT EXISTS villages (
  id           TEXT    PRIMARY KEY,        -- 村落 id（与剧本一致）
  scenario     TEXT    NOT NULL,           -- 所属剧本名
  tier         TEXT    NOT NULL,           -- 层级：li/ting/xiang/xian/jun
  level        INTEGER NOT NULL DEFAULT 1, -- 等级 1..5
  population   INTEGER NOT NULL DEFAULT 0, -- 人口
  minxin       INTEGER NOT NULL DEFAULT 0, -- 民心 0-100
  tax          INTEGER NOT NULL DEFAULT 35,-- 赋税 0-100
  chief        INTEGER NOT NULL DEFAULT 0, -- 是否任命里长（0/1）
  militia      INTEGER NOT NULL DEFAULT 0, -- 乡勇
  owner        TEXT    NOT NULL,           -- 归属势力
  explored     INTEGER NOT NULL DEFAULT 0, -- 是否已探索（0/1）
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== 2. 建筑表（buildings）：聚落与建筑的从属关系（一村落多建筑）=====
CREATE TABLE IF NOT EXISTS buildings (
  village_id   TEXT    NOT NULL,
  build_type   TEXT    NOT NULL,           -- farm/well/workshop/granary/school
  slot_index   INTEGER NOT NULL,           -- 空地槽位索引（容量由 TIER_PLOTS 控制）
  PRIMARY KEY (village_id, slot_index),
  FOREIGN KEY (village_id) REFERENCES villages(id)
);

-- ===== 3. 英雄卡牌表（heroes）：静态属性 + 运行时解锁状态 =====
CREATE TABLE IF NOT EXISTS heroes (
  id           TEXT    PRIMARY KEY,
  scenario     TEXT    NOT NULL,
  name         TEXT    NOT NULL,
  title        TEXT    NOT NULL DEFAULT '',
  emoji        TEXT    NOT NULL DEFAULT '',
  bound_village TEXT   NOT NULL,
  unlocked     INTEGER NOT NULL DEFAULT 0, -- 是否已招揽（0/1）
  stats_json   TEXT    NOT NULL DEFAULT '{}', -- 五维数值 JSON
  clan_json    TEXT    NOT NULL DEFAULT '[]', -- 宗族/人际引用 JSON
  meta_json    TEXT    NOT NULL DEFAULT '{}'  -- hometown/bond/bonus/biography 等
);

-- ===== 4. NPC 人际表（npcs）=====
CREATE TABLE IF NOT EXISTS npcs (
  id           TEXT    PRIMARY KEY,
  scenario     TEXT    NOT NULL,
  name         TEXT    NOT NULL,
  relation     TEXT    NOT NULL DEFAULT '',
  note         TEXT    NOT NULL DEFAULT '',
  bound_village TEXT   NOT NULL DEFAULT '', -- 已开发地点（可跳转聚焦）
  region       TEXT    NOT NULL DEFAULT '', -- 待开发地点的描述地名
  status       TEXT    NOT NULL DEFAULT 'to_develop' -- developed/to_develop
);

-- ===== 5. 奇遇分支表（adventure_branches）：整棵奇遇树配置 =====
-- 一张表保存一棵奇遇（nodes_json 内含节点、选择支与成效，应用层解析），
-- 避免引入树/节点/选择三张表的方言差异；运行时进度单独存 saves。
CREATE TABLE IF NOT EXISTS adventure_branches (
  id           TEXT    PRIMARY KEY,        -- 奇遇树 id
  scenario     TEXT    NOT NULL,
  chapter      TEXT    NOT NULL DEFAULT '',
  title        TEXT    NOT NULL DEFAULT '',
  root_id      TEXT    NOT NULL,
  trigger_json TEXT    NOT NULL DEFAULT '{}', -- 触发条件（复用 QuestTrigger）
  nodes_json   TEXT    NOT NULL DEFAULT '[]'   -- 节点 + 选择支 + 成效 JSON
);

-- ===== 6. 玩家存档表（saves）：整局快照 =====
-- data 存序列化后的完整运行时状态（同 persistence.serialize 的 blob），
-- 换库后为 localStorage 的直接替代品；只新增 Adapter，sim-core 不动。
CREATE TABLE IF NOT EXISTS saves (
  slot         TEXT    PRIMARY KEY,
  scenario     TEXT    NOT NULL DEFAULT '',
  data         TEXT    NOT NULL,           -- 存档快照 JSON
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- PG 迁移备忘（非必须，仅供后续参考）：
--   * 所有 `INTEGER PRIMARY KEY` → `BIGSERIAL PRIMARY KEY`（如需自增代理键）；
--     当前设计用业务自然键（villages.id / heroes.id / slot 等）作主键，PG 直接兼容。
--   * `updated_at` 自动更新可在 PG 用触发器或 `DEFAULT now()` 实现。
--   * JSON 字段如需索引/查询，PG 侧将 TEXT 改为 JSONB；SQLite 仍用 TEXT。
-- ----------------------------------------------------------------------------
