import { defineConfig } from "drizzle-kit";
import path from "path";

function buildSupabaseUrl(): string | undefined {
  const pw = process.env.SUPABASE_DB_PASSWORD;
  const supaUrl = process.env.SUPABASE_URL;
  if (!pw || !supaUrl) return undefined;
  const ref = supaUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!ref) return undefined;
  const encodedPw = encodeURIComponent(pw);
  // Session pooler port 5432 for drizzle-kit (needs a persistent connection).
  return `postgresql://postgres.${ref}:${encodedPw}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;
}

const dbUrl =
  process.env.DATABASE_URL ??
  process.env.SUPABASE_PRODUCTION_DB_URL ??
  process.env.SUPABASE_DATABASE_URL ??
  buildSupabaseUrl();

if (!dbUrl) {
  throw new Error(
    "No database URL found. Set DATABASE_URL, SUPABASE_PRODUCTION_DB_URL, SUPABASE_DATABASE_URL, or SUPABASE_DB_PASSWORD + SUPABASE_URL.",
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
