import "server-only";
import { createDb, type Db } from "@jupa/db";

const globalForDb = globalThis as unknown as { db?: Db };

/**
 * Create the connection only when a request actually touches the database.
 * Next evaluates route modules while collecting build output, when runtime-only
 * environment variables may not be available yet.
 */
export function getDb(): Db {
  if (!globalForDb.db) globalForDb.db = createDb();
  return globalForDb.db;
}

/** Keeps existing call sites ergonomic while deferring initialization. */
export const db = new Proxy({} as Db, {
  get(_target, property) {
    const instance = getDb();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
