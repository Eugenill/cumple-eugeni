import { createClient } from "@supabase/supabase-js";

/**
 * Client amb la service_role — només per a ús al servidor.
 * Pot saltar-se el RLS i, per tant, NO pot arribar mai al navegador.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

/**
 * Client anònim per a lectures al servidor (respecta el RLS).
 */
export function createSupabasePublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export const BUCKET = process.env.SUPABASE_BUCKET ?? "moments";
