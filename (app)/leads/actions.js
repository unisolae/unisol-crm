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

function num(v) {
  const t = clean(v);
  if (t === null) return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export async function createLead(formData) {
  const supabase = await createClient();

  const payload = {
    company_id: COMPANY_ID,
    source: 'manual',
    crm_status: clean(formData.get('crm_status')) || 'unknown',
    project_desc: clean(formData.get('project_desc')),
    associate: clean(formData.get('associate')),
    address_street: clean(formData.get('address_street')),
    city: clean(formData.get('city')),
    municipality: clean(formData.get('municipality')),
    salesperson_id: clean(formData.get('salesperson_id')),
    priority: clean(formData.get('priority')),
    lead_type: clean(formData.get('lead_type')) || 'technical',
    needs: clean(formData.get('needs')),
    lead_size_eur: num(formData.get('lead_size_eur')),
    notes: clean(formData.get('notes')),
  };

  const { data, error } = await supabase
    .from('leads')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/leads');
  redirect(`/leads/${data.id}`);
}

export async function updateLead(id, formData) {
  const supabase = await createClient();

  const payload = {
    crm_status: clean(formData.get('crm_status')) || 'unknown',
    salesperson_id: clean(formData.get('salesperson_id')),
    prefecture: clean(formData.get('prefecture')),
    priority: clean(formData.get('priority')),
    lead_type: clean(formData.get('lead_type')) || 'technical',
    associate: clean(formData.get('associate')),
    needs: clean(formData.get('needs')),
    lead_size_eur: num(formData.get('lead_size_eur')),
    sale_value_eur: num(formData.get('sale_value_eur')),
    notes: clean(formData.get('notes')),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('leads').update(payload).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/leads/${id}`);
  revalidatePath('/leads');
  redirect(`/leads/${id}`);
}

// Γρήγορη ενημέρωση επιλεγμένων πεδίων κατευθείαν από τη λίστα (inline edit).
export async function quickUpdateLead(id, patch) {
  const supabase = await createClient();

  const allowed = {};
  if ('crm_status' in patch) allowed.crm_status = clean(patch.crm_status) || 'unknown';
  if ('salesperson_id' in patch) allowed.salesperson_id = clean(patch.salesperson_id);
  if ('lead_size_eur' in patch) allowed.lead_size_eur = num(patch.lead_size_eur);
  if ('priority' in patch) allowed.priority = clean(patch.priority);
  if ('lead_type' in patch) allowed.lead_type = clean(patch.lead_type) || 'technical';
  allowed.updated_at = new Date().toISOString();

  const { error } = await supabase.from('leads').update(allowed).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/leads');
  return { ok: true };
}
