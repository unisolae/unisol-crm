import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ActionNewClient from './ActionNewClient';

export default async function NewActionPage() {
  const supabase = await createClient();

  // Μόνο τα leads προφορτώνονται· οι συνεργάτες αναζητούνται στον server
  // (αποφυγή ορίου 1000 με χιλιάδες επαφές).
  const { data: leads } = await supabase
    .from('leads')
    .select('id, project_desc, city')
    .order('created_at', { ascending: false })
    .limit(300);

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
        <ActionNewClient leads={leads ?? []} />
      </div>
    </div>
  );
}
