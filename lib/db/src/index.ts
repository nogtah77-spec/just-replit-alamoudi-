import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Replit development uses its managed DATABASE_URL. Vercel production uses
// the project's Supabase connection when the Supabase component secrets are
// available; otherwise it falls back to an explicitly supplied DATABASE_URL.
function buildSupabaseUrl(): string | undefined {
  const pw = process.env.SUPABASE_DB_PASSWORD;
  const supaUrl = process.env.SUPABASE_URL;
  if (!pw || !supaUrl) return undefined;

  const ref = supaUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!ref) return undefined;

  const encodedPw = encodeURIComponent(pw);
  return `postgresql://postgres.${ref}:${encodedPw}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`;
}

const connectionString =
  process.env.VERCEL === "1" || process.env.VERCEL_ENV
    ? process.env.SUPABASE_PRODUCTION_DB_URL ??
      buildSupabaseUrl() ??
      process.env.SUPABASE_DATABASE_URL ??
      process.env.DATABASE_URL
    : process.env.DATABASE_URL ??
      process.env.SUPABASE_DATABASE_URL ??
      buildSupabaseUrl();

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
