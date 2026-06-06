import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LeadsFilters from './LeadsFilters';
import LeadsTabs from './LeadsTabs';
import LeadsScope from './LeadsScope';
import { InlineStatus, InlineSalesperson, InlineSize, InlinePriority, InlineType } from './InlineEdit';

export default async function LeadsPage({ searchParams }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const statusList = (sp.status ?? '').split(',').filter(Boolean);
  const salesList = (sp.sp ?? '').split(',').filter(Boolean);
  const prioList = (sp.prio ?? '').split(',').filter(Boolean);
  const typeList = (sp.type ?? '').split(',').filter(Boolean);
  // scope: 'mine' (δικά μου + αδιάθετα, προεπιλογή) | 'all'
  const scope = sp.scope === 'all' ? 'all' : 'mine';

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: salespeople } = await supabase
    .from('profiles')
    .select('id, name:full_name')
    .eq('is_salesperson', true)
    .order('full_name');

  // querystring για να το περνάμε στους συνδέσμους (διατήρηση context στο "πίσω")
  const ctx = new URLSearchParams();
  if (q) ctx.set('q', q);
  if (sp.status) ctx.set('status', sp.status);
  if (sp.sp) ctx.set('sp', sp.sp);
  if (sp.prio) ctx.set('prio', sp.prio);
  if (sp.type) ctx.set('type', sp.type);
  if (sp.scope) ctx.set('scope', sp.scope);
  const ctxStr = ctx.toString();

  // Εφαρμόζει όλα τα φίλτρα ΕΚΤΟΣ από το status (για τους μετρητές των tabs)
  function applyBaseFilters(query) {
    // scope: "δικά μου" = ανατεθειμένα σε μένα Ή αδιάθετα
    if (scope === 'mine') {
      query = query.or(`salesperson_id.eq.${user.id},salesperson_id.is.null`);
    }
    // Αν ο χρήστης επιλέξει ρητά πωλητές από το φίλτρο, αυτό υπερισχύει
    if (salesList.length) query = query.in('salesperson_id', salesList);
    if (prioList.length) query = query.in('priority', prioList);
    if (typeList.length) query = query.in('lead_type', typeList);
    if (q) {
      const like = `%${q}%`;
      query = query.or(
        `project_desc.ilike.${like},address_street.ilike.${like},city.ilike.${like},municipality.ilike.${like},engineer.ilike.${like},associate.ilike.${like},external_ref.ilike.${like}`
      );
    }
    return query;
  }

  let query = applyBaseFilters(
    supabase
      .from('leads')
      .select('id, project_desc, city, municipality, engineer, associate, crm_status, lead_size_eur, source, salesperson_id, priority, lead_type, salespeople:profiles!leads_salesperson_id_fkey(name:full_name)')
      .order('created_at', { ascending: false })
      .limit(300)
  );
  if (statusList.length) query = query.in('crm_status', statusList);

  const { data: leads } = await query;

  // Μετρητές ανά κατάσταση (σέβονται τα υπόλοιπα φίλτρα, όχι το status)
  async function countFor(status) {
    let cq = applyBaseFilters(
      supabase.from('leads').select('*', { count: 'exact', head: true })
    );
    if (status) cq = cq.eq('crm_status', status);
    const { count } = await cq;
    return count ?? 0;
  }

  const [cAll, cActive, cUnknown, cClosed, cNegative] = await Promise.all([
    countFor(null),
    countFor('active'),
    countFor('unknown'),
    countFor('closed'),
    countFor('negative'),
  ]);
  const counts = { all: cAll, active: cActive, unknown: cUnknown, closed: cClosed, negative: cNegative };

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

      <LeadsScope current={scope} />

      <LeadsTabs counts={counts} />

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
                    <Link href={`/leads/${l.id}${ctxStr ? `?from=${encodeURIComponent(ctxStr)}` : ''}`}>
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
