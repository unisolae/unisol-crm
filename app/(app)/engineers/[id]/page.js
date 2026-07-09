import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CRM_STATUS } from '@/lib/labels';

export default async function EngineerDetail({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: engineer } = await supabase
    .from('engineers')
    .select('*')
    .eq('id', id)
    .single();

  if (!engineer) notFound();

  // Οι άδειες του μηχανικού — ανάποδη χρονολογική σειρά (ημ. έκδοσης, μετά καταχώριση)
  const { data: leadsRaw } = await supabase
    .from('leads')
    .select(
      'id, external_ref, project_desc, city, municipality, prefecture, crm_status, ' +
        'permit_type, permit_date, created_at, lead_size_eur, sale_value_eur, ' +
        'salespeople:profiles!leads_salesperson_id_fkey(name:full_name)'
    )
    .eq('engineer_id', id)
    .order('permit_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  const leads = leadsRaw ?? [];

  // Σύνοψη ανά κατάσταση
  const count = (s) => leads.filter((l) => l.crm_status === s).length;
  const stats = [
    { label: 'Σύνολο αδειών', value: leads.length },
    { label: 'Ενεργές', value: count('active') },
    { label: 'Κλειστές', value: count('closed') },
    { label: 'Αρνητικές', value: count('negative') },
    { label: 'Αδιερεύνητες', value: count('unknown') },
  ];

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('el-GR') : '—');
  const sub = [
    engineer.specialty,
    engineer.tee_number ? `Α.Μ. ΤΕΕ ${engineer.tee_number}` : null,
    engineer.registry_year ? `Μητρώο ${engineer.registry_year}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link href="/engineers">← Πίσω στους μηχανικούς</Link>
      </div>

      <div className="page-head">
        <h1>{engineer.full_name}</h1>
        <p>{sub || 'Μηχανικός'}</p>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
      </div>

      <section className="card">
        <h2>Άδειες</h2>

        {leads.length === 0 ? (
          <div className="dash-empty">Καμία άδεια συνδεδεμένη ακόμη.</div>
        ) : (
          <>
            <div className="table-wrap d-only">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>Ημ. έκδοσης</th>
                    <th>Έργο</th>
                    <th>Περιοχή</th>
                    <th>Πωλητής</th>
                    <th>Κατάσταση</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="row-link">
                      <td className="cell-sub">{fmtDate(l.permit_date)}</td>
                      <td className="cell-main">
                        <Link href={`/leads/${l.id}`}>{l.project_desc || '—'}</Link>
                        {l.external_ref && (
                          <span className="cell-sub">Α/Α {l.external_ref}</span>
                        )}
                      </td>
                      <td>
                        {l.city || '—'}
                        {l.municipality && <span className="cell-sub">{l.municipality}</span>}
                      </td>
                      <td>{l.salespeople?.name || '—'}</td>
                      <td>
                        <span className={`badge st-${l.crm_status}`}>
                          {CRM_STATUS[l.crm_status] || ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Κινητό: λίστα-κάρτες */}
            <div className="m-cards m-only">
              {leads.map((l) => (
                <Link key={l.id} href={`/leads/${l.id}`} className="m-card">
                  <div className="m-card-main">
                    <div className="m-card-t">{l.project_desc || 'Χωρίς περιγραφή'}</div>
                    <div className="m-card-s">
                      {[fmtDate(l.permit_date), l.city].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="m-card-side">
                    <span className={`badge st-${l.crm_status}`}>
                      {CRM_STATUS[l.crm_status] || ''}
                    </span>
                    {l.external_ref && (
                      <span className="m-card-amt">Α/Α {l.external_ref}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
