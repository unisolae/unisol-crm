import { NextResponse } from 'next/server';
import { parsePartnersExcel } from '@/lib/parsePartnersExcel';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardAdmin } from '@/lib/guardAdmin';

const nameKey = (fn, cn) =>
  String(fn || '').trim().toLowerCase() + '|' + String(cn || '').trim().toLowerCase();

const norm = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export async function POST(request) {
  const guard = await guardAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Δεν βρέθηκε αρχείο.' }, { status: 400 });
  }

  let rows;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    rows = parsePartnersExcel(buffer).rows;
  } catch {
    return NextResponse.json({ error: 'Το αρχείο δεν διαβάστηκε.' }, { status: 400 });
  }
  if (!rows.length) {
    return NextResponse.json({ error: 'Δεν βρέθηκαν έγκυρες γραμμές.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const companyId = guard.companyId;

  // Υπάρχοντα ERP + ονόματα (για dedup με τη βάση)
  const codes = rows.map((r) => r.erp_code).filter(Boolean);
  let existingCodes = new Set();
  if (codes.length) {
    const { data } = await admin
      .from('partners')
      .select('erp_code')
      .eq('company_id', companyId)
      .in('erp_code', codes);
    existingCodes = new Set((data ?? []).map((e) => e.erp_code));
  }
  const { data: existingNames } = await admin
    .from('partners')
    .select('full_name, company_name')
    .eq('company_id', companyId);
  const existingNameSet = new Set(
    (existingNames ?? []).map((e) => nameKey(e.full_name, e.company_name))
  );

  // Πωλητές: όνομα → id
  const { data: sps } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('company_id', companyId)
    .eq('is_salesperson', true);
  const spByName = new Map((sps ?? []).map((s) => [norm(s.full_name), s.id]));

  const seen = new Set(); // dedup μέσα στο ίδιο αρχείο
  const toInsert = [];
  for (const r of rows) {
    const nk = nameKey(r.full_name, r.company_name);
    const codeDup = r.erp_code && existingCodes.has(r.erp_code);
    const nameDup = !r.erp_code && existingNameSet.has(nk);
    const fileKey = r.erp_code ? 'c:' + r.erp_code : 'n:' + nk;
    if (codeDup || nameDup || seen.has(fileKey)) continue;
    seen.add(fileKey);

    toInsert.push({
      company_id: companyId,
      erp_code: r.erp_code ?? null,
      full_name: r.full_name ?? null,
      company_name: r.company_name ?? null,
      phone: r.phone ?? null,
      mobile: r.mobile ?? null,
      email: r.email ?? null,
      address: r.address ?? null,
      main_supplier: r.main_supplier ?? null,
      notes: r.notes ?? null,
      type: r.type || 'crew',
      salesperson_id: r.salesperson_name ? spByName.get(norm(r.salesperson_name)) ?? null : null,
      is_active: true,
    });
  }

  let inserted = 0;
  if (toInsert.length) {
    const { data, error } = await admin.from('partners').insert(toInsert).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inserted = data?.length ?? 0;
  }

  return NextResponse.json({
    inserted,
    skipped: rows.length - inserted,
    total: rows.length,
  });
}
