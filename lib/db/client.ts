import "server-only";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const migrationsFolder = path.join(process.cwd(), "lib/db/migrations");

const globalForDb = globalThis as unknown as { dbPromise?: Promise<Db> };

/**
 * Postgres when DATABASE_URL is set (Neon, Supabase, …); otherwise embedded PGlite,
 * so development and tests need no database account. Migrations run on first use.
 */
export function getDb(): Promise<Db> {
  globalForDb.dbPromise ??= connect().catch((error) => {
    globalForDb.dbPromise = undefined;
    throw error;
  });
  return globalForDb.dbPromise;
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const [{ default: postgres }, { drizzle }, { migrate }] = await Promise.all([
      import("postgres"),
      import("drizzle-orm/postgres-js"),
      import("drizzle-orm/postgres-js/migrator"),
    ]);
    // prepare: false keeps it compatible with transaction-mode poolers (Supabase, Neon pooler).
    const db = drizzle(postgres(url, { prepare: false, max: 5 }), { schema });
    await migrate(db, { migrationsFolder });
    return db as unknown as Db;
  }

  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const onServerless = Boolean(process.env.VERCEL || process.env.NETLIFY);
  if (onServerless) {
    console.warn("[db] DATABASE_URL is not set — using an in-memory database. Quotes will NOT be kept. Set DATABASE_URL.");
  }
  const dataDir = onServerless ? undefined : (process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data/pglite"));
  const db = drizzle(new PGlite(dataDir), { schema });
  await migrate(db, { migrationsFolder });
  return db as unknown as Db;
}

export { schema };
