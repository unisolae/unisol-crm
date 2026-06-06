import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LeadsFilters from './LeadsFilters';
import { InlineStatus, InlineSalesperson, InlineSize, InlinePriority, InlineType } from './InlineEdit';

export default async function LeadsPage({ searchParams }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const statusList = (sp.status ?? '').split(',').filter(Boolean);
  const salesList = (sp.sp ?? '').split(',').filter(Boolean);
  const prioList = (sp.prio ?? '').split(',').filter(Boolean);
  const typeList = (sp.type ?? '').split(',').filter(Boolean);

  const supabase = await createClient();

  const { data: salespeople } = await supabase
    .from('profiles')
    .select('id, name:full_name')
    .eq('is_salesperson', true)
    .order('full_name');

  let query = supabase
    .from('leads')
    .select('id, project_desc, city, municipality, engineer, associate, crm_status, lead_size_eur, source, salesperson_id, priority, lead_type, salespeople:profiles!leads_salesperson_id_fkey(name:full_name)')
    .order('created_at', { ascending: false })
    .limit(300);

  if (statusList.length) query = query.in('crm_status', statusList);
  if (salesList.length) query = query.in('salesperson_id', salesList);
  if (prioList.length) query = query.in('priority', prioList);
  if (typeList.length) query = query.in('lead_type', typeList);
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
              <th>Τύπος</th>
              <th>Προτερ.</th>
              <th>Μέγεθος</th>
              <th>Κατάσταση</th>
            </tr>
          </thead>
          <tbody>
            {(leads ?? []).map((l) => {
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
                  <td className="cell-edit">
                    <InlineSalesperson id={l.id} value={l.salesperson_id} salespeople={salespeople ?? []} />
                  </td>
                  <td className="cell-edit">
                    <InlineType id={l.id} value={l.lead_type} />
                  </td>
                  <td className="cell-edit">
                    <InlinePriority id={l.id} value={l.priority} />
                  </td>
                  <td className="cell-edit">
                    <InlineSize id={l.id} value={l.lead_size_eur} />
                  </td>
                  <td className="cell-edit">
                    <InlineStatus id={l.id} value={l.crm_status} />
                  </td>
                </tr>
              );
            })}
            {(!leads || leads.length === 0) && (
              <tr>
                <td colSpan={8} className="empty-row">
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
