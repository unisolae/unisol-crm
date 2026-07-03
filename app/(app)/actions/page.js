import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ActionsFilter from './ActionsFilter';
import { partnerName } from '@/lib/labels';

// Προγραμματισμένες (επερχόμενες) πάνω, μετά ολοκληρωμένες (πρόσφατες πρώτα).
function actionSort(a, b) {
  const ap = a.status === 'planned';
  const bp = b.status === 'planned';
  if (ap && bp) return new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0);
  if (ap) return -1;
  if (bp) return 1;
  return new Date(b.acted_at || 0) - new Date(a.acted_at || 0);
}

export default async function ActionsPage({ searchParams }) {
  const sp = await searchParams;
  const ownerFilter = sp?.owner || 'all';
  const statusFilter = sp?.status || 'all'; // all | planned | done

  const supabase = await createClient();

  let query = supabase
    .from('actions')
    .select(
      'id, description, result, is_final, next_action_at, acted_at, status, scheduled_at, ' +
        'lead:leads(id, project_desc, city), ' +
        'partner:partners!actions_partner_id_fkey(id, full_name, company_name), ' +
        'salesperson:profiles!actions_salesperson_id_fkey(id, name:full_name)'
    )
    .limit(400);

  if (ownerFilter !== 'all') query = query.eq('salesperson_id', ownerFilter);
  if (statusFilter !== 'all') query = query.eq('status', statusFilter);

  const [rawRes, spRes] = await Promise.all([
    query,
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_salesperson', true)
      .order('full_name'),
  ]);
  const actions = (rawRes.data ?? []).slice().sort(actionSort);
  const salespeople = spRes.data;

  const fmtDateTime = (d) =>
    d
      ? new Date(d).toLocaleString('el-GR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  return (
    <div className="page">
      <div className="page-head with-action">
        <div>
          <h1>Ενέργειες &amp; επαφές</h1>
          <p>Καταγεγραμμένες και προγραμματισμένες ενέργειες — σε leads και συνεργάτες.</p>
        </div>
        <Link className="btn-primary" href="/actions/new">
          + Νέα ενέργεια
        </Link>
      </div>

      <ActionsFilter salespeople={salespeople ?? []} owner={ownerFilter} status={statusFilter} />

      <div className="table-wrap d-only">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Πότε</th>
              <th>Κατάσταση</th>
              <th>Πωλητής</th>
              <th>Στόχος</th>
              <th>Ενέργεια</th>
              <th>Αποτέλεσμα</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => {
              const planned = a.status === 'planned';
              return (
                <tr key={a.id}>
                  <td className="cell-sub">
                    {planned ? `⏳ ${fmtDateTime(a.scheduled_at)}` : fmtDateTime(a.acted_at)}
                  </td>
                  <td>
                    {planned ? (
                      <span className="badge badge-planned">προγραμματισμένη</span>
                    ) : (
                      <span className="badge st-active">ολοκληρωμένη</span>
                    )}
                  </td>
                  <td>{a.salesperson?.name || '—'}</td>
                  <td>
                    {a.lead ? (
                      <a className="row-link" href={`/leads/${a.lead.id}`}>
                        {(a.lead.project_desc || 'lead').slice(0, 38)}
                      </a>
                    ) : a.partner ? (
                      <a className="row-link" href={`/partners/${a.partner.id}`}>
                        {partnerName(a.partner)} <span className="cell-sub">· συνεργάτης</span>
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {a.description || '—'}
                    {a.is_final && (
                      <span className="badge st-closed" style={{ marginLeft: 6 }}>
                        τελική
                      </span>
                    )}
                  </td>
                  <td className="cell-sub">{a.result || '—'}</td>
                </tr>
              );
            })}
            {actions.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  Καμία ενέργεια για αυτά τα φίλτρα.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Κινητό: λίστα-κάρτες — ταπ σε ενέργεια πάει στον στόχο της */}
      <div className="m-cards m-only">
        {actions.map((a) => {
          const planned = a.status === 'planned';
          const href = a.lead
            ? `/leads/${a.lead.id}`
            : a.partner
            ? `/partners/${a.partner.id}`
            : '/actions';
          const target = a.lead
            ? (a.lead.project_desc || 'Lead').slice(0, 42)
            : a.partner
            ? partnerName(a.partner)
            : '—';
          return (
            <Link key={a.id} href={href} className="m-card">
              <div className="m-card-main">
                <div className="m-card-t">{a.description || '—'}</div>
                <div className="m-card-s">
                  {target}
                  {a.salesperson?.name ? ` · ${a.salesperson.name}` : ''}
                </div>
              </div>
              <div className="m-card-side">
                <span className={`badge ${planned ? 'badge-planned' : 'st-active'}`}>
                  {planned ? 'προγραμμ.' : 'έγινε'}
                </span>
                <span className="m-card-amt">
                  {planned ? fmtDateTime(a.scheduled_at) : fmtDateTime(a.acted_at)}
                </span>
              </div>
            </Link>
          );
        })}
        {actions.length === 0 && (
          <div className="m-card-empty">Καμία ενέργεια για αυτά τα φίλτρα.</div>
        )}
      </div>
    </div>
  );
}
