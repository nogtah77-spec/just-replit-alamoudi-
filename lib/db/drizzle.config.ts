import { defineConfig } from "drizzle-kit";
import path from "path";

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

const dbUrl =
  buildSupabaseUrl() ??
  process.env.SUPABASE_DATABASE_URL ??
  process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "No database URL found. Set SUPABASE_DATABASE_URL or SUPABASE_DB_PASSWORD + SUPABASE_URL.",
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
