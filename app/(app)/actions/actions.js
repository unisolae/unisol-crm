'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

function clean(v) {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

async function currentUserId(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// --- Καταγραφή ενέργειας πώλησης --------------------------------------------
// Αν οριστεί "επόμενη ενέργεια (next_action_at)", δημιουργείται ΑΥΤΟΜΑΤΑ
// υπενθύμιση (reminder) στο inbox του πωλητή για εκείνη την ημερομηνία.
export async function createAction(leadId, formData) {
  const supabase = await createClient();
  const me = await currentUserId(supabase);

  const description = clean(formData.get('description'));
  const result = clean(formData.get('result'));
  const isFinal = formData.get('is_final') === 'on';
  const nextAt = clean(formData.get('next_action_at'));
  const notes = clean(formData.get('notes'));

  const { data: action, error } = await supabase
    .from('actions')
    .insert({
      company_id: COMPANY_ID,
      lead_id: leadId,
      salesperson_id: me,
      description,
      result,
      is_final: isFinal,
      next_action_at: nextAt,
      notes,
      acted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  // Auto-reminder: αν υπάρχει επόμενη ενέργεια και δεν είναι τελική,
  // φτιάχνουμε reminder στο inbox μου, συνδεδεμένο με το lead.
  if (nextAt && !isFinal) {
    // Φέρνουμε σύντομη περιγραφή lead για το κείμενο της υπενθύμισης
    const { data: lead } = await supabase
      .from('leads')
      .select('project_desc')
      .eq('id', leadId)
      .single();

    const label = lead?.project_desc
      ? `Επόμενη ενέργεια: ${lead.project_desc.slice(0, 60)}`
      : 'Επόμενη ενέργεια (follow-up)';

    const { data: msg } = await supabase
      .from('messages')
      .insert({
        company_id: COMPANY_ID,
        type: 'reminder',
        sender_id: me,
        recipient_user_id: me, // υπενθύμιση στον εαυτό μου
        lead_id: leadId,
        body: label,
        priority: 'medium',
        due_at: nextAt,
        status: 'new',
      })
      .select('id')
      .single();

    // Notification για να ανάψει το badge όταν φτάσει η ώρα
    if (msg) {
      await supabase.from('notifications').insert({
        company_id: COMPANY_ID,
        user_id: me,
        message_id: msg.id,
        type: 'due_reminder',
      });
    }
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/actions');
  return { ok: true };
}
