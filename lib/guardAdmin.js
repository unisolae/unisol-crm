import { createClient } from '@/lib/supabase/server';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// Επιστρέφει { ok, user, companyId } ή { ok:false } αν δεν επιτρέπεται.
export async function guardAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, status: 401, error: 'Δεν είστε συνδεδεμένος.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { ok: false, status: 403, error: 'Απαιτείται ρόλος διαχειριστή.' };
  }

  return { ok: true, user, companyId: profile.company_id ?? COMPANY_ID };
}
