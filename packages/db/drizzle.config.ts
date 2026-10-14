import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  // Prefer a direct/session connection for schema operations. Runtime serverless
  // functions use the transaction-pooler DATABASE_URL instead.
  dbCredentials: {
    url: process.env.DIRECT_URL
      ?? process.env.DATABASE_URL
      ?? "postgres://jupa:jupa@localhost:5432/jupa",
  },
});
