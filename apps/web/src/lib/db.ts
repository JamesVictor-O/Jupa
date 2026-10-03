import "server-only";
import { createDb, type Db } from "@jupa/db";

const globalForDb = globalThis as unknown as { db?: Db };

/** One pooled client per server process (survives dev hot reloads). */
export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;
