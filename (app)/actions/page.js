import { createClient } from '@/lib/supabase/server';
import ActionsFilter from './ActionsFilter';

export default async function ActionsPage({ searchParams }) {
  const sp = await searchParams;
  const ownerFilter = sp?.owner || 'all';

  const supabase = await createClient();

  let query = supabase
    .from('actions')
    .select(
      'id, description, result, is_final, next_action_at, acted_at, ' +
        'lead:leads(id, project_desc, city), ' +
        'salesperson:profiles!actions_salesperson_id_fkey(id, name:full_name)'
    )
    .order('acted_at', { ascending: false })
    .limit(300);

  if (ownerFilter !== 'all') {
    query = query.eq('salesperson_id', ownerFilter);
  }

  const { data: actions } = await query;

  // Πωλητές για το φίλτρο
  const { data: salespeople } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('is_salesperson', true)
    .order('full_name');

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
          <h1>Ενέργειες πωλήσεων</h1>
          <p>Όλες οι καταγεγραμμένες ενέργειες — με φίλτρο ανά πωλητή.</p>
        </div>
      </div>

      <ActionsFilter salespeople={salespeople ?? []} current={ownerFilter} />

      <div className="table-wrap">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Ημ/νία</th>
              <th>Πωλητής</th>
              <th>Lead</th>
              <th>Ενέργεια</th>
              <th>Αποτέλεσμα</th>
              <th>Επόμενη</th>
            </tr>
          </thead>
          <tbody>
            {(actions ?? []).map((a) => (
              <tr key={a.id}>
                <td className="cell-sub">{fmtDateTime(a.acted_at)}</td>
                <td>{a.salesperson?.name || '—'}</td>
                <td>
                  {a.lead ? (
                    <a className="row-link" href={`/leads/${a.lead.id}`}>
                      {(a.lead.project_desc || 'lead').slice(0, 40)}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {a.description || '—'}
                  {a.is_final && <span className="badge st-closed" style={{ marginLeft: 6 }}>τελική</span>}
                </td>
                <td className="cell-sub">{a.result || '—'}</td>
                <td className="cell-sub">
                  {a.next_action_at ? fmtDateTime(a.next_action_at) : '—'}
                </td>
              </tr>
            ))}
            {(actions ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  Καμία ενέργεια για αυτό το φίλτρο.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
