import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PartnerForm from '../PartnerForm';

export default async function NewPartnerPage() {
  const supabase = await createClient();
  const { data: salespeople } = await supabase
    .from('profiles')
    .select('id, name:full_name')
    .eq('is_salesperson', true)
    .order('full_name');

  return (
    <div className="page narrow">
      <div className="breadcrumb">
        <Link href="/partners">← Πίσω στους συνεργάτες</Link>
      </div>

      <div className="page-head">
        <h1>Νέος συνεργάτης</h1>
        <p>Καταχώρησε τύπο και στοιχεία επικοινωνίας. Ό,τι λείπει (π.χ. κωδικός ERP), το συμπληρώνεις αργότερα.</p>
      </div>

      <div className="card">
        <PartnerForm mode="new" partner={null} salespeople={salespeople ?? []} />
      </div>
    </div>
  );
}
