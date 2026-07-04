'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const TYPES = [
  'crew', 'engineer', 'manufacturer', 'contractor',
  'tech_company', 'merchant', 'individual',
];

function clean(v) {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

function readPartner(fd) {
  let type = clean(fd.get('type'));
  if (!TYPES.includes(type)) type = 'crew';
  return {
    erp_code: clean(fd.get('erp_code')),
    full_name: clean(fd.get('full_name')),
    company_name: clean(fd.get('company_name')),
    phone: clean(fd.get('phone')),
    mobile: clean(fd.get('mobile')),
    email: clean(fd.get('email')),
    address: clean(fd.get('address')),
    main_supplier: clean(fd.get('main_supplier')),
    salesperson_id: clean(fd.get('salesperson_id')),
    type,
    is_active: fd.get('is_active') === 'on',
    notes: clean(fd.get('notes')),
  };
}

// --- Δημιουργία (πλήρης φόρμα) -----------------------------------------------
export async function createPartner(formData) {
  const supabase = await createClient();
  const payload = { company_id: COMPANY_ID, ...readPartner(formData) };
  if (!payload.full_name && !payload.company_name) {
    return { error: 'Χρειάζεται ονοματεπώνυμο ή επωνυμία.' };
  }
  const { data, error } = await supabase
    .from('partners')
    .insert(payload)
    .select('id')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/partners');
  return { ok: true, id: data.id };
}

// --- Επεξεργασία -------------------------------------------------------------
export async function updatePartner(id, formData) {
  const supabase = await createClient();
  const payload = readPartner(formData);
  if (!payload.full_name && !payload.company_name) {
    return { error: 'Χρειάζεται ονοματεπώνυμο ή επωνυμία.' };
  }
  const { error } = await supabase.from('partners').update(payload).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/partners');
  revalidatePath(`/partners/${id}`);
  return { ok: true, id };
}

// --- Διαγραφή (cascade αποσυνδέει από τα leads) -------------------------------
export async function deletePartner(id) {
  const supabase = await createClient();
  const { error } = await supabase.from('partners').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/partners');
  return { ok: true };
}

// --- Γρήγορη δημιουργία από την καρτέλα lead (όνομα + τύπος) ------------------
export async function createPartnerInline(name, type) {
  const supabase = await createClient();
  const t = TYPES.includes(type) ? type : 'crew';
  const full_name = clean(name);
  if (!full_name) return { error: 'Κενό όνομα.' };
  const { data, error } = await supabase
    .from('partners')
    .insert({ company_id: COMPANY_ID, full_name, type: t })
    .select('id, full_name, company_name, type')
    .single();
  if (error) return { error: error.message };
  return { partner: data };
}

// --- Σύνδεση / αποσύνδεση συνεργάτη με lead ----------------------------------
export async function linkPartner(leadId, partnerId) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('lead_partners')
    .insert({ lead_id: leadId, partner_id: partnerId });
  // αγνόησε σφάλμα διπλότυπου (ήδη συνδεδεμένος)
  if (error && !/duplicate|unique/i.test(error.message)) {
    return { error: error.message };
  }
  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/partners/${partnerId}`);
  return { ok: true };
}

export async function unlinkPartner(leadId, partnerId) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('lead_partners')
    .delete()
    .eq('lead_id', leadId)
    .eq('partner_id', partnerId);
  if (error) return { error: error.message };
  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/partners/${partnerId}`);
  return { ok: true };
}

// --- Αναζήτηση συνεργατών στον server (όνομα / επωνυμία / κωδικός ERP) -------
// Λύνει το όριο 1000 γραμμών: δεν φορτώνουμε όλους τους συνεργάτες στον client.
export async function searchPartners(query) {
  const supabase = await createClient();
  const q = (query || '').trim();

  let req = supabase
    .from('partners')
    .select('id, full_name, company_name, type, erp_code')
    .eq('is_active', true)
    .limit(20);

  if (q) {
    // Καθαρισμός χαρακτήρων που σπάνε το φίλτρο .or του PostgREST
    const safe = q.replace(/[,()%]/g, ' ').trim();
    if (safe) {
      const like = `%${safe}%`;
      req = req
        .or(`full_name.ilike.${like},company_name.ilike.${like},erp_code.ilike.${like}`)
        .order('full_name', { ascending: true });
    }
  } else {
    req = req.order('created_at', { ascending: false });
  }

  const { data, error } = await req;
  if (error) return { error: error.message };
  return { partners: data ?? [] };
}
