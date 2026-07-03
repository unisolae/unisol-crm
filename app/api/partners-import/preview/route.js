import { NextResponse } from 'next/server';
import { parsePartnersExcel } from '@/lib/parsePartnersExcel';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardAdmin } from '@/lib/guardAdmin';

const nameKey = (fn, cn) =>
  String(fn || '').trim().toLowerCase() + '|' + String(cn || '').trim().toLowerCase();

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

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = parsePartnersExcel(buffer);
  } catch {
    return NextResponse.json(
      { error: 'Το αρχείο δεν διαβάστηκε. Βεβαιωθείτε ότι είναι έγκυρο Excel (.xlsx).' },
      { status: 400 }
    );
  }

  const { rows, unmatched } = parsed;
  if (!rows.length) {
    return NextResponse.json(
      { error: 'Δεν βρέθηκαν έγκυρες γραμμές (με ονοματεπώνυμο ή επωνυμία).' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Υπάρχοντες κωδικοί ERP
  const codes = rows.map((r) => r.erp_code).filter(Boolean);
  let existingCodes = new Set();
  if (codes.length) {
    const { data } = await admin
      .from('partners')
      .select('erp_code')
      .eq('company_id', guard.companyId)
      .in('erp_code', codes);
    existingCodes = new Set((data ?? []).map((e) => e.erp_code));
  }

  // Υπάρχοντα ονόματα (dedup γραμμών χωρίς ERP)
  const { data: existingNames } = await admin
    .from('partners')
    .select('full_name, company_name')
    .eq('company_id', guard.companyId);
  const existingNameSet = new Set(
    (existingNames ?? []).map((e) => nameKey(e.full_name, e.company_name))
  );

  let dup = 0;
  for (const r of rows) {
    if (r.erp_code && existingCodes.has(r.erp_code)) dup++;
    else if (!r.erp_code && existingNameSet.has(nameKey(r.full_name, r.company_name))) dup++;
  }

  return NextResponse.json({
    total: rows.length,
    newCount: rows.length - dup,
    duplicateCount: dup,
    unmatched,
    sample: rows.slice(0, 5).map((r) => ({
      name: r.full_name || r.company_name,
      type: r.type,
      phone: r.mobile || r.phone || null,
    })),
  });
}
