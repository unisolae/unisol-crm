import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ActionNewClient from './ActionNewClient';
import { partnerName } from '@/lib/labels';

export default async function NewActionPage() {
  const supabase = await createClient();

  const [{ data: leads }, { data: partnersRaw }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, project_desc, city')
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('partners')
      .select('id, full_name, company_name, type')
      .eq('is_active', true),
  ]);

  const partners = (partnersRaw ?? []).sort((a, b) =>
    partnerName(a).localeCompare(partnerName(b), 'el')
  );

  return (
    <div className="page narrow">
      <div className="breadcrumb">
        <Link href="/actions">← Ενέργειες &amp; επαφές</Link>
      </div>

      <div className="page-head">
        <h1>Νέα ενέργεια</h1>
        <p>Διάλεξε πρώτα πού αφορά — lead ή συνεργάτη — και μετά κατέγραψε ή προγραμμάτισε.</p>
      </div>

      <div className="card">
        <ActionNewClient leads={leads ?? []} partners={partners} />
      </div>
    </div>
  );
}
