import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";
export { and, desc, eq, gte, inArray, notInArray, sql } from "drizzle-orm";

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set");
  const local = /^(?:postgres(?:ql)?:\/\/)?[^/]*(?:localhost|127\.0\.0\.1)/i.test(url);
  return drizzle(postgres(url, {
    // Vercel instances should not each create Postgres.js's default pool of 10.
    max: process.env.NODE_ENV === "production" ? 1 : 10,
    // Required by Supabase's transaction-mode pooler.
    prepare: false,
    ssl: local ? false : "require",
  }), { schema });
}

export type Db = ReturnType<typeof createDb>;
