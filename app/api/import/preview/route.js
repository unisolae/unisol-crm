import { NextResponse } from 'next/server';
import { parseLeadsExcel } from '@/lib/parseExcel';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardAdmin } from '@/lib/guardAdmin';

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
    parsed = parseLeadsExcel(buffer);
  } catch {
    return NextResponse.json(
      { error: 'Το αρχείο δεν διαβάστηκε. Βεβαιωθείτε ότι είναι έγκυρο Excel (.xlsx).' },
      { status: 400 }
    );
  }

  const { rows, unmatched } = parsed;

  if (!rows.length) {
    return NextResponse.json(
      { error: 'Δεν βρέθηκαν έγκυρες γραμμές (με Α/Α Αίτησης) στο αρχείο.' },
      { status: 400 }
    );
  }

  // Έλεγχος ποιες υπάρχουν ήδη (με βάση external_ref + company)
  const refs = rows.map((r) => r.external_ref);
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('leads')
    .select('external_ref')
    .eq('company_id', guard.companyId)
    .in('external_ref', refs);

  const existingSet = new Set((existing ?? []).map((e) => e.external_ref));
  const newCount = rows.filter((r) => !existingSet.has(r.external_ref)).length;

  return NextResponse.json({
    total: rows.length,
    newCount,
    duplicateCount: rows.length - newCount,
    unmatched,
    sample: rows.slice(0, 5).map((r) => ({
      external_ref: r.external_ref,
      project_desc: r.project_desc,
      city: r.city,
    })),
  });
}
