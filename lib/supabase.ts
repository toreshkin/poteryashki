import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Все обращения к БД идут через API-роуты с service_role ключом.
// RLS включён без политик, поэтому anon-доступ с клиента закрыт.
let serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Не заданы NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY в .env.local"
      );
    }
    serviceClient = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return serviceClient;
}
