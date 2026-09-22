import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://inuouzvmujxjjzfxinvk.supabase.co";

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludW91enZtdWp4amp6ZnhpbnZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NzE1ODksImV4cCI6MjEwNTQ0NzU4OX0.FNj2k8xA2NONS-2kYTPTO5fbQ1I2GNR9ja9NuGVlLMw";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 20
);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
