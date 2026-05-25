import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const STATUS_LABELS = {
  unknown: 'Άγνωστη',
  active: 'Ενεργή',
  closed: 'Κλειστή',
  negative: 'Αρνητική',
};

export default async function Dashboard() {
  const supabase = await createClient();

  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  const { count: activeLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('crm_status', 'active');

  const { count: unknownLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('crm_status', 'unknown');

  const { data: pipeline } = await supabase
    .from('leads')
    .select('lead_size_eur')
    .not('lead_size_eur', 'is', null);

  const pipelineSum = (pipeline ?? []).reduce(
    (acc, r) => acc + Number(r.lead_size_eur || 0),
    0
  );

  return (
    <div className="page">
      <div className="page-head">
        <h1>Επισκόπηση</h1>
        <p>Καλωσήρθες στο σύστημα διαχείρισης ευκαιριών πωλήσεων.</p>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="label">Σύνολο leads</div>
          <div className="value">{totalLeads ?? 0}</div>
        </div>
        <div className="stat">
          <div className="label">Ενεργά</div>
          <div className="value">{activeLeads ?? 0}</div>
          <div className="hint">{STATUS_LABELS.active}</div>
        </div>
        <div className="stat">
          <div className="label">Αδιερεύνητα</div>
          <div className="value">{unknownLeads ?? 0}</div>
          <div className="hint">Χρειάζονται έλεγχο</div>
        </div>
        <div className="stat">
          <div className="label">Αξία pipeline</div>
          <div className="value">
            {pipelineSum.toLocaleString('el-GR')}€
          </div>
        </div>
      </div>

      <div className="cta-row">
        <Link className="btn-inline" href="/leads">
          Δες όλα τα leads →
        </Link>
      </div>
    </div>
  );
}
