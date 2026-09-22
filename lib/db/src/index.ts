import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function buildSupabaseUrl(): string | undefined {
  const pw = process.env.SUPABASE_DB_PASSWORD;
  const supaUrl = process.env.SUPABASE_URL;
  if (!pw || !supaUrl) return undefined;

  const ref = supaUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!ref) return undefined;

  const encodedPw = encodeURIComponent(pw);
  const suppliedUrl = process.env.SUPABASE_DATABASE_URL;
  if (suppliedUrl) {
    try {
      const parsed = new URL(suppliedUrl);
      parsed.username = `postgres.${ref}`;
      parsed.password = pw;
      parsed.pathname = parsed.pathname || "/postgres";
      return parsed.toString();
    } catch {
      // Fall through to the direct Supabase host.
    }
  }
  return `postgresql://postgres:${encodedPw}@db.${ref}.supabase.co:5432/postgres`;
}

const connectionString =
  buildSupabaseUrl() ??
  process.env.SUPABASE_DATABASE_URL ??
  process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "[db] WARNING: No database connection string found. " +
      "Set DATABASE_URL, SUPABASE_DATABASE_URL, or SUPABASE_DB_PASSWORD + SUPABASE_URL. " +
      "All database queries will fail until one of these is provided.",
  );
}

export const pool = new Pool(connectionString ? { connectionString } : {});
export const db = drizzle(pool, { schema });

export * from "./schema";
