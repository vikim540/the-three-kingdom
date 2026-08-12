import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL || "file:sqlite.db";

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof createClient> | undefined;
};

export const client = globalForDb.client ?? createClient({ url: dbUrl });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
