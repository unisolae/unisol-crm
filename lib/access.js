import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Κεντρικό σημείο για το «ποιος είναι ο χρήστης και τι βλέπει».
// isPartner = true → ανήκει σε συνεργαζόμενη εταιρεία (π.χ. Baumit) και
// έχει περιορισμένη εμβέλεια (μόνο τα leads που του έχουν ανατεθεί).

export async function getAccess(supabaseArg) {
  const supabase = supabaseArg ?? (await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: null, partnerOrgId: null, isPartner: false };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, partner_org_id')
    .eq('id', user.id)
    .single();

  return {
    user,
    role: profile?.role ?? null,
    partnerOrgId: profile?.partner_org_id ?? null,
    isPartner: !!profile?.partner_org_id,
  };
}

// Guard για οθόνες αποκλειστικά εσωτερικής χρήσης.
// Μη συνδεδεμένος → /login. Συνεργάτης → /leads (η αρχική του οθόνη).
export async function requireInternal(supabaseArg) {
  const acc = await getAccess(supabaseArg);
  if (!acc.user) redirect('/login');
  if (acc.isPartner) redirect('/leads');
  return acc;
}

// Επιβεβαιώνει δικαίωμα ΕΓΓΡΑΦΗΣ σε lead. Οι εσωτερικοί έχουν πάντα πρόσβαση·
// ο συνεργάτης μόνο στα δικά του, μη-αποσυρμένα leads. (Δεύτερη γραμμή άμυνας
// πάνω από το RLS — καλύπτει και τυχόν μελλοντικά service-role write paths.)
export async function assertLeadWritable(supabase, leadId) {
  const acc = await getAccess(supabase);
  if (!acc.user) return { ok: false, error: 'Δεν είστε συνδεδεμένος.' };
  if (!acc.isPartner) return { ok: true, acc };

  const { data: lead } = await supabase
    .from('leads')
    .select('partner_org_id, partner_access_revoked')
    .eq('id', leadId)
    .single();

  if (!lead || lead.partner_org_id !== acc.partnerOrgId || lead.partner_access_revoked) {
    return { ok: false, error: 'Δεν έχετε πρόσβαση σε αυτό το lead.' };
  }
  return { ok: true, acc };
}
