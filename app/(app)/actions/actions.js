'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toTimestamp } from '@/lib/datetime';

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

// Δημιουργεί reminder + notification στον εαυτό μου για μια ημερομηνία (follow-up).
async function createSelfReminder(supabase, me, { leadId, label, at }) {
  const { data: msg } = await supabase
    .from('messages')
    .insert({
      company_id: COMPANY_ID,
      type: 'reminder',
      sender_id: me,
      recipient_user_id: me,
      lead_id: leadId ?? null,
      body: label,
      priority: 'medium',
      due_at: at,
      status: 'new',
    })
    .select('id')
    .single();

  if (msg) {
    await supabase.from('notifications').insert({
      company_id: COMPANY_ID,
      user_id: me,
      message_id: msg.id,
      type: 'due_reminder',
    });
  }
}

// Κοινή εισαγωγή ενέργειας — για lead ή για συνεργάτη, ολοκληρωμένη ή προγραμματισμένη.
async function insertAction(supabase, { leadId, partnerId, formData }) {
  const me = await currentUserId(supabase);
  const kind = formData.get('kind') === 'planned' ? 'planned' : 'done';
  const description = clean(formData.get('description'));
  const notes = clean(formData.get('notes'));

  // --- Προγραμματισμένη (θα γίνει) ---
  if (kind === 'planned') {
    const scheduledAt = toTimestamp(formData.get('scheduled_at'));
    const { error } = await supabase.from('actions').insert({
      company_id: COMPANY_ID,
      lead_id: leadId ?? null,
      partner_id: partnerId ?? null,
      salesperson_id: me,
      description,
      notes,
      status: 'planned',
      scheduled_at: scheduledAt,
      is_final: false,
      acted_at: null,
    });
    return { error: error?.message };
  }

  // --- Ολοκληρωμένη (έγινε) ---
  const result = clean(formData.get('result'));
  const isFinal = formData.get('is_final') === 'on';
  const nextAt = toTimestamp(formData.get('next_action_at'));
  const actedAt = toTimestamp(formData.get('acted_at')) || new Date().toISOString();

  const { error } = await supabase.from('actions').insert({
    company_id: COMPANY_ID,
    lead_id: leadId ?? null,
    partner_id: partnerId ?? null,
    salesperson_id: me,
    description,
    result,
    is_final: isFinal,
    next_action_at: nextAt,
    notes,
    status: 'done',
    acted_at: actedAt,
  });
  if (error) return { error: error.message };

  // Auto-reminder: όπως πριν — μόνο για ολοκληρωμένη ενέργεια με επόμενο βήμα.
  if (nextAt && !isFinal) {
    let label = 'Επόμενη ενέργεια (follow-up)';
    if (leadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('project_desc')
        .eq('id', leadId)
        .single();
      if (lead?.project_desc) label = `Επόμενη ενέργεια: ${lead.project_desc.slice(0, 60)}`;
    } else if (partnerId) {
      const { data: p } = await supabase
        .from('partners')
        .select('full_name, company_name')
        .eq('id', partnerId)
        .single();
      const nm = p?.full_name || p?.company_name;
      if (nm) label = `Επόμενη επαφή: ${nm.slice(0, 60)}`;
    }
    await createSelfReminder(supabase, me, { leadId, label, at: nextAt });
  }

  return {};
}

// --- Ενέργεια για lead ------------------------------------------------------
export async function createAction(leadId, formData) {
  const supabase = await createClient();
  const res = await insertAction(supabase, { leadId, partnerId: null, formData });
  if (res.error) return { error: res.error };
  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/actions');
  revalidatePath('/calendar');
  return { ok: true };
}

// --- Ενέργεια επαφής για συνεργάτη (χωρίς lead) ------------------------------
export async function createPartnerAction(partnerId, formData) {
  const supabase = await createClient();
  const res = await insertAction(supabase, { leadId: null, partnerId, formData });
  if (res.error) return { error: res.error };
  revalidatePath(`/partners/${partnerId}`);
  revalidatePath('/actions');
  revalidatePath('/calendar');
  return { ok: true };
}

// --- Ολοκλήρωση προγραμματισμένης ενέργειας ---------------------------------
export async function completeAction(actionId, formData) {
  const supabase = await createClient();

  const patch = { status: 'done', acted_at: new Date().toISOString() };
  const result = formData ? clean(formData.get('result')) : null;
  if (result) patch.result = result;

  const { data: existing } = await supabase
    .from('actions')
    .select('lead_id, partner_id')
    .eq('id', actionId)
    .single();

  const { error } = await supabase.from('actions').update(patch).eq('id', actionId);
  if (error) return { error: error.message };

  if (existing?.lead_id) revalidatePath(`/leads/${existing.lead_id}`);
  if (existing?.partner_id) revalidatePath(`/partners/${existing.partner_id}`);
  revalidatePath('/actions');
  revalidatePath('/calendar');
  return { ok: true };
}

// --- Επεξεργασία ------------------------------------------------------------
export async function updateAction(actionId, formData) {
  const supabase = await createClient();

  const formKind = formData.get('form_kind') === 'planned' ? 'planned' : 'done';
  const patch = {
    description: clean(formData.get('description')),
    notes: clean(formData.get('notes')),
  };
  if (formKind === 'planned') {
    patch.scheduled_at = toTimestamp(formData.get('scheduled_at'));
  } else {
    patch.result = clean(formData.get('result'));
    patch.is_final = formData.get('is_final') === 'on';
    patch.next_action_at = toTimestamp(formData.get('next_action_at'));
    const actedAt = toTimestamp(formData.get('acted_at'));
    if (actedAt) patch.acted_at = actedAt;
  }

  const { data: existing, error: e0 } = await supabase
    .from('actions')
    .select('lead_id, partner_id')
    .eq('id', actionId)
    .single();
  if (e0) return { error: e0.message };

  const { error } = await supabase.from('actions').update(patch).eq('id', actionId);
  if (error) return { error: error.message };

  if (existing?.lead_id) revalidatePath(`/leads/${existing.lead_id}`);
  if (existing?.partner_id) revalidatePath(`/partners/${existing.partner_id}`);
  revalidatePath('/actions');
  revalidatePath('/calendar');
  return { ok: true };
}

// --- Διαγραφή ---------------------------------------------------------------
export async function deleteAction(actionId) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('actions')
    .select('lead_id, partner_id')
    .eq('id', actionId)
    .single();

  const { error } = await supabase.from('actions').delete().eq('id', actionId);
  if (error) return { error: error.message };

  if (existing?.lead_id) revalidatePath(`/leads/${existing.lead_id}`);
  if (existing?.partner_id) revalidatePath(`/partners/${existing.partner_id}`);
  revalidatePath('/actions');
  revalidatePath('/calendar');
  return { ok: true };
}
