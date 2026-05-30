'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

function clean(v) {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

// Τρέχων χρήστης (profile id = auth user id)
async function currentUserId(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// --- Δημιουργία νέου μηνύματος / εκκρεμότητας --------------------------------
export async function createMessage(formData) {
  const supabase = await createClient();
  const senderId = await currentUserId(supabase);

  // Παραλήπτης: είτε συγκεκριμένος χρήστης, είτε ομάδα. Ένα από τα δύο.
  const recipientUser = clean(formData.get('recipient_user_id'));
  const recipientGroup = clean(formData.get('recipient_group'));

  const payload = {
    company_id: COMPANY_ID,
    type: clean(formData.get('type')) || 'message',
    sender_id: senderId,
    recipient_user_id: recipientUser,
    recipient_group: recipientUser ? null : recipientGroup, // προτεραιότητα στον χρήστη
    lead_id: clean(formData.get('lead_id')),
    third_party_name: clean(formData.get('third_party_name')),
    third_party_phone: clean(formData.get('third_party_phone')),
    body: clean(formData.get('body')),
    priority: clean(formData.get('priority')) || 'medium',
    due_at: clean(formData.get('due_at')),
    status: 'new',
  };

  const { data, error } = await supabase
    .from('messages')
    .insert(payload)
    .select('id')
    .single();

  if (error) return { error: error.message };

  // Notification στον παραλήπτη-χρήστη (αν υπάρχει συγκεκριμένος)
  if (recipientUser) {
    await supabase.from('notifications').insert({
      company_id: COMPANY_ID,
      user_id: recipientUser,
      message_id: data.id,
      type: 'new_message',
    });
  }

  revalidatePath('/inbox');
  redirect('/inbox');
}

// --- Ολοκλήρωση εκκρεμότητας -------------------------------------------------
export async function completeMessage(id) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('messages')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/inbox');
  return { ok: true };
}

// --- Ανάληψη από group inbox (το αναθέτω στον εαυτό μου) ---------------------
export async function claimMessage(id) {
  const supabase = await createClient();
  const me = await currentUserId(supabase);
  const { error } = await supabase
    .from('messages')
    .update({ recipient_user_id: me, recipient_group: null, status: 'in_progress' })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/inbox');
  return { ok: true };
}

// --- Μετατροπή μηνύματος σε Ενέργεια Πώλησης --------------------------------
// Δημιουργεί action στο συνδεδεμένο lead και σημειώνει το μήνυμα ως ολοκληρωμένο.
export async function convertToAction(id) {
  const supabase = await createClient();
  const me = await currentUserId(supabase);

  const { data: msg, error: e1 } = await supabase
    .from('messages')
    .select('id, lead_id, body, type')
    .eq('id', id)
    .single();
  if (e1) return { error: e1.message };
  if (!msg.lead_id) return { error: 'Το μήνυμα δεν είναι συνδεδεμένο με lead.' };

  const { data: action, error: e2 } = await supabase
    .from('actions')
    .insert({
      company_id: COMPANY_ID,
      lead_id: msg.lead_id,
      salesperson_id: me,
      description: msg.body || 'Από μήνυμα/εκκρεμότητα',
      acted_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (e2) return { error: e2.message };

  await supabase
    .from('messages')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
      converted_action_id: action.id,
    })
    .eq('id', id);

  revalidatePath('/inbox');
  revalidatePath(`/leads/${msg.lead_id}`);
  return { ok: true };
}
