'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAccess, assertLeadWritable } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/admin';

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

  // Οι συνεργαζόμενες εταιρείες δεν δημιουργούν leads — δουλεύουν όσα τους αναθέτουμε.
  const acc = await getAccess(supabase);
  if (acc.isPartner) {
    return { error: 'Οι συνεργαζόμενες εταιρείες δεν δημιουργούν νέα leads.' };
  }

  const crmStatus = clean(formData.get('crm_status')) || 'unknown';

  const payload = {
    company_id: COMPANY_ID,
    source: 'manual',
    crm_status: crmStatus,
    negative_reason:
      crmStatus === 'negative' ? clean(formData.get('negative_reason')) : null,
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

  // Δικαίωμα εγγραφής: εσωτερικοί → πάντα· συνεργάτης → μόνο τα δικά του leads.
  const gate = await assertLeadWritable(supabase, id);
  if (!gate.ok) return { error: gate.error };
  const isPartner = gate.acc.isPartner;

  const crmStatus = clean(formData.get('crm_status')) || 'unknown';

  const payload = {
    crm_status: crmStatus,
    // Λόγος αρνητικής έκβασης: κρατιέται μόνο όταν η κατάσταση είναι «Αρνητική».
    negative_reason:
      crmStatus === 'negative' ? clean(formData.get('negative_reason')) : null,
    priority: clean(formData.get('priority')),
    lead_type: clean(formData.get('lead_type')) || 'technical',
    associate: clean(formData.get('associate')),
    needs: clean(formData.get('needs')),
    lead_size_eur: num(formData.get('lead_size_eur')),
    sale_value_eur: num(formData.get('sale_value_eur')),
    notes: clean(formData.get('notes')),
    updated_at: new Date().toISOString(),
  };

  // Πεδία που ΜΟΝΟ εσωτερικοί χρήστες ορίζουν (ο πωλητής μας, ο νομός).
  // Για συνεργάτες ΔΕΝ τα περνάμε καν στο payload, ώστε να μη μηδενιστούν κατά λάθος.
  if (!isPartner) {
    payload.salesperson_id = clean(formData.get('salesperson_id'));
    payload.prefecture = clean(formData.get('prefecture'));
  }

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

  const gate = await assertLeadWritable(supabase, id);
  if (!gate.ok) return { error: gate.error };
  const isPartner = gate.acc.isPartner;

  const allowed = {};
  if ('crm_status' in patch) allowed.crm_status = clean(patch.crm_status) || 'unknown';
  // Ο πωλητής αλλάζει μόνο από εσωτερικούς χρήστες.
  if (!isPartner && 'salesperson_id' in patch) allowed.salesperson_id = clean(patch.salesperson_id);
  if ('lead_size_eur' in patch) allowed.lead_size_eur = num(patch.lead_size_eur);
  if ('priority' in patch) allowed.priority = clean(patch.priority);
  if ('lead_type' in patch) allowed.lead_type = clean(patch.lead_type) || 'technical';
  allowed.updated_at = new Date().toISOString();

  const { error } = await supabase.from('leads').update(allowed).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/leads');
  return { ok: true };
}

// Απόσυρση / επαναφορά της πρόσβασης συνεργάτη σε ένα lead (μόνο εσωτερικοί).
// Όταν revoked=true, ο συνεργάτης δεν το βλέπει πια (χωρίς να χαθεί η ανάθεση).
export async function setLeadPartnerAccess(id, revoked) {
  const supabase = await createClient();

  const acc = await getAccess(supabase);
  if (!acc.user) return { error: 'Δεν είστε συνδεδεμένος.' };
  if (acc.isPartner) return { error: 'Μη εξουσιοδοτημένη ενέργεια.' };

  const { error } = await supabase
    .from('leads')
    .update({ partner_access_revoked: !!revoked, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/leads/${id}`);
  revalidatePath('/leads');
  return { ok: true };
}

// Κοινοποίηση / αφαίρεση κοινοποίησης ενός lead σε συνεργαζόμενη εταιρεία
// (π.χ. Baumit) — το ίδιο που κάνει η μαζική εισαγωγή από Excel, αλλά επιλεκτικά
// για ένα lead που είναι ήδη μέσα στην εφαρμογή. Επιτρέπεται σε ΚΑΘΕ εσωτερικό
// χρήστη· οι συνεργάτες ΔΕΝ αλλάζουν αναθέσεις (και το RLS τους μπλοκάρει).
//   partnerOrgId κενό/null → αφαίρεση ανάθεσης (καθαρό ξεκίνημα, ξανα-κοινοποιήσιμο).
//   partnerOrgId με τιμή   → ανάθεση + άρση τυχόν προηγούμενης απόσυρσης.
export async function shareLeadWithPartner(id, partnerOrgId) {
  const supabase = await createClient();

  const acc = await getAccess(supabase);
  if (!acc.user) return { error: 'Δεν είστε συνδεδεμένος.' };
  if (acc.isPartner) return { error: 'Μη εξουσιοδοτημένη ενέργεια.' };

  const orgId = clean(partnerOrgId);

  // Αν δόθηκε εταιρεία, επιβεβαιώνουμε ότι υπάρχει, είναι ενεργή και ανήκει στην
  // εταιρεία μας (αμυντικός έλεγχος, δεύτερη γραμμή πάνω από το RLS).
  if (orgId) {
    const { data: org } = await supabase
      .from('partner_orgs')
      .select('id')
      .eq('id', orgId)
      .eq('company_id', COMPANY_ID)
      .eq('is_active', true)
      .single();
    if (!org) return { error: 'Μη έγκυρη συνεργαζόμενη εταιρεία.' };
  }

  const { error } = await supabase
    .from('leads')
    .update({
      partner_org_id: orgId, // null = αφαίρεση ανάθεσης
      partner_access_revoked: false, // κάθε νέα ανάθεση/αφαίρεση ξεκινά «ενεργή»
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/leads/${id}`);
  revalidatePath('/leads');
  return { ok: true };
}

// Μαζική διαγραφή leads. Επιτρέπεται σε εσωτερικούς ΚΑΙ σε συνεργάτες
// (οι συνεργάτες μόνο στα δικά τους, μη-αποσυρμένα). ΔΕΝ διαγράφονται leads
// που έχουν ενέργειες (θεωρούνται «διερευνημένα»). Service-role με ρητό
// έλεγχο χρήστη + tenant/partner scope· σβήνει πρώτα τις ετικέτες συνεργατών.
export async function bulkDeleteLeads(ids) {
  const supabase = await createClient();
  const acc = await getAccess(supabase);
  if (!acc.user) return { error: 'Δεν είστε συνδεδεμένος.' };

  const wanted = (Array.isArray(ids) ? ids : [])
    .map((x) => String(x))
    .filter((x) => /^[0-9a-fA-F-]{36}$/.test(x));
  if (wanted.length === 0) return { error: 'Καμία έγκυρη επιλογή.' };

  const admin = createAdminClient();

  let scopeQ = admin.from('leads').select('id').eq('company_id', COMPANY_ID).in('id', wanted);
  if (acc.isPartner) {
    scopeQ = scopeQ.eq('partner_org_id', acc.partnerOrgId).eq('partner_access_revoked', false);
  }
  const { data: scoped, error: sErr } = await scopeQ;
  if (sErr) return { error: 'Σφάλμα ελέγχου: ' + sErr.message };
  const scopedIds = (scoped ?? []).map((r) => r.id);
  if (scopedIds.length === 0) return { error: 'Δεν βρέθηκαν leads προς διαγραφή.' };

  const { data: acts, error: aErr } = await admin
    .from('actions').select('lead_id').in('lead_id', scopedIds);
  if (aErr) return { error: 'Σφάλμα ελέγχου ενεργειών: ' + aErr.message };
  const hasActions = new Set((acts ?? []).map((r) => r.lead_id));
  const deletable = scopedIds.filter((id) => !hasActions.has(id));
  const skipped = scopedIds.length - deletable.length;

  if (deletable.length === 0) return { ok: true, deleted: 0, skipped };

  await admin.from('lead_partners').delete().in('lead_id', deletable);
  await admin.from('messages').update({ lead_id: null }).in('lead_id', deletable);

  const { error: dErr } = await admin.from('leads').delete().in('id', deletable);
  if (dErr) return { error: 'Σφάλμα διαγραφής: ' + dErr.message };

  revalidatePath('/leads');
  return { ok: true, deleted: deletable.length, skipped };
}
