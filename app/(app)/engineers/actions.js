'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAccess } from '@/lib/access';

function clean(v) {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

// Ενημέρωση στοιχείων επικοινωνίας / παρατηρήσεων μηχανικού.
// Τα στοιχεία ΥΔΟΜ (όνομα, ΤΕΕ, ειδικότητα, έτος) μένουν κλειδωμένα — ενημερώνονται
// μόνο αυτόματα από την εισαγωγή αδειών (και κλειδώνονται στη βάση για συνεργάτες).
// Επιτρέπεται και σε συνεργάτες, αλλά ΜΟΝΟ για μηχανικούς των δικών τους
// κοινοποιημένων αδειών· το όριο (ποιους μηχανικούς) το επιβάλλει το RLS (Migration 15).
export async function updateEngineerContact(id, formData) {
  const supabase = await createClient();

  const acc = await getAccess(supabase);
  if (!acc.user) return { error: 'Δεν είστε συνδεδεμένος.' };

  const payload = {
    phone: clean(formData.get('phone')),
    email: clean(formData.get('email')),
    address: clean(formData.get('address')),
    city: clean(formData.get('city')),
    postal_code: clean(formData.get('postal_code')),
    notes: clean(formData.get('notes')),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('engineers').update(payload).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/engineers');
  revalidatePath(`/engineers/${id}`);
  return { ok: true };
}
