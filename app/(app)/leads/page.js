import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LeadsFilters from './LeadsFilters';

const STATUS = {
  unknown: { label: 'Άγνωστη', cls: 'st-unknown' },
  active: { label: 'Ενεργή', cls: 'st-active' },
  closed: { label: 'Κλειστή', cls: 'st-closed' },
  negative: { label: 'Αρνητική', cls: 'st-negative' },
};

export default async function LeadsPage({ searchParams }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const status = sp.status ?? '';
  const salesId = sp.sp ?? '';

  const supabase = await createClient();

  const { data: salespeople } = await supabase
    .from('salespeople')
    .select('id, name')
    .order('name');

  let query = supabase
    .from('leads')
    .select('id, project_desc, city, municipality, engineer, associate, crm_status, lead_size_eur, source, salespeople(name)')
    .order('created_at', { ascending: false })
    .limit(300);

  if (status) query = query.eq('crm_status', status);
  if (salesId) query = query.eq('salesperson_id', salesId);
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `project_desc.ilike.${like},address_street.ilike.${like},city.ilike.${like},municipality.ilike.${like},engineer.ilike.${like},associate.ilike.${like},external_ref.ilike.${like}`
    );
  }

  const { data: leads } = await query;

  return (
    <div className="page">
      <div className="page-head with-action">
        <div>
          <h1>Leads</h1>
          <p>{leads?.length ?? 0} εγγραφές</p>
        </div>
        <Link className="btn-primary" href="/leads/new">
          + Νέο lead
        </Link>
      </div>

      <LeadsFilters salespeople={salespeople ?? []} />

      <div className="table-wrap">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Έργο</th>
              <th>Περιοχή</th>
              <th>Συνεργάτης</th>
              <th>Πωλητής</th>
              <th>Μέγεθος</th>
              <th>Κατάσταση</th>
            </tr>
          </thead>
          <tbody>
            {(leads ?? []).map((l) => {
              const st = STATUS[l.crm_status] ?? STATUS.unknown;
              return (
                <tr key={l.id} className="row-link">
                  <td className="cell-main">
                    <Link href={`/leads/${l.id}`}>
                      {l.project_desc || '—'}
                    </Link>
                    {l.engineer && <span className="cell-sub">{l.engineer.split('(')[0].trim()}</span>}
                  </td>
                  <td>
                    {l.city || '—'}
                    {l.municipality && <span className="cell-sub">{l.municipality}</span>}
                  </td>
                  <td>{l.associate || (l.source === 'manual' ? '—' : '')}</td>
                  <td>{l.salespeople?.name || <span className="muted">—</span>}</td>
                  <td>{l.lead_size_eur ? `${Number(l.lead_size_eur).toLocaleString('el-GR')}€` : '—'}</td>
                  <td>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                  </td>
                </tr>
              );
            })}
            {(!leads || leads.length === 0) && (
              <tr>
                <td colSpan={6} className="empty-row">
                  Δεν βρέθηκαν leads με αυτά τα κριτήρια.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
