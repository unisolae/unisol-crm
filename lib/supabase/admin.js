import { createClient } from '@supabase/supabase-js';

// ΠΡΟΣΟΧΗ: μόνο για server-side χρήση (API routes). Το service key ΔΕΝ
// εκτίθεται ποτέ στον browser — δεν έχει το πρόθεμα NEXT_PUBLIC_.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
