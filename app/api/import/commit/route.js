import { NextResponse } from 'next/server';
import { parseLeadsExcel } from '@/lib/parseExcel';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardAdmin } from '@/lib/guardAdmin';
import { PREFECTURES } from '@/lib/prefectures';

export async function POST(request) {
  const guard = await guardAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const prefecture = formData.get('prefecture');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Δεν βρέθηκε αρχείο.' }, { status: 400 });
  }
  if (!prefecture || !PREFECTURES.includes(prefecture)) {
    return NextResponse.json({ error: 'Επιλέξτε έγκυρο νομό.' }, { status: 400 });
  }

  let rows;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    rows = parseLeadsExcel(buffer).rows;
  } catch {
    return NextResponse.json({ error: 'Το αρχείο δεν διαβάστηκε.' }, { status: 400 });
  }

  if (!rows.length) {
    return NextResponse.json({ error: 'Δεν βρέθηκαν έγκυρες γραμμές.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const importedAt = new Date().toISOString();

  // Εμπλουτισμός κάθε γραμμής με τα κοινά πεδία
  const payload = rows.map((r) => ({
    ...r,
    company_id: guard.companyId,
    source: 'ydom_import',
    crm_status: 'unknown',
    lead_type: 'technical',
    prefecture, // αυτόματη ανάθεση νομού σε όλες τις εγγραφές
    imported_at: importedAt,
  }));

  // upsert με ignoreDuplicates: τα ήδη υπάρχοντα (ίδιο company+external_ref) αγνοούνται
  const { data, error } = await admin
    .from('leads')
    .upsert(payload, {
      onConflict: 'company_id,external_ref',
      ignoreDuplicates: true,
    })
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const inserted = data?.length ?? 0;
  return NextResponse.json({
    inserted,
    skipped: rows.length - inserted,
    total: rows.length,
  });
}
