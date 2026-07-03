import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PartnersFilters from './PartnersFilters';
import { PARTNER_TYPE, partnerName } from '@/lib/labels';

export default async function PartnersPage({ searchParams }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const typeList = (sp.type ?? '').split(',').filter(Boolean);

  const supabase = await createClient();

  let query = supabase
    .from('partners')
    .select(
      'id, erp_code, full_name, company_name, type, phone, mobile, is_active, ' +
        'salesperson:profiles!partners_salesperson_id_fkey(name:full_name), ' +
        'lead_partners(count)'
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (typeList.length) query = query.in('type', typeList);
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `full_name.ilike.${like},company_name.ilike.${like},phone.ilike.${like},mobile.ilike.${like},erp_code.ilike.${like}`
    );
  }

  const { data: partners } = await query;

  return (
    <div className="page">
      <div className="page-head with-action">
        <div>
          <h1>Συνεργάτες</h1>
          <p>{partners?.length ?? 0} εγγραφές</p>
        </div>
        <div className="head-actions">
          <Link className="btn-ghost" href="/partners/import">
            Εισαγωγή Excel
          </Link>
          <Link className="btn-primary" href="/partners/new">
            + Νέος συνεργάτης
          </Link>
        </div>
      </div>

      <PartnersFilters />

      <div className="table-wrap d-only">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Όνομα</th>
              <th>Τύπος</th>
              <th>Τηλέφωνα</th>
              <th>Υπεύθυνος</th>
              <th>Κωδ. ERP</th>
              <th>Leads</th>
            </tr>
          </thead>
          <tbody>
            {(partners ?? []).map((p) => {
              const leads = p.lead_partners?.[0]?.count ?? 0;
              return (
                <tr key={p.id} className="row-link">
                  <td className="cell-main">
                    <Link href={`/partners/${p.id}`}>{partnerName(p)}</Link>
                    {p.company_name && p.full_name && (
                      <span className="cell-sub">{p.company_name}</span>
                    )}
                    {!p.is_active && <span className="cell-sub">ανενεργός</span>}
                  </td>
                  <td>
                    <span className="badge badge-neutral">{PARTNER_TYPE[p.type] || p.type}</span>
                  </td>
                  <td className="cell-sub">
                    {[p.mobile, p.phone].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td>{p.salesperson?.name || '—'}</td>
                  <td className="cell-sub">{p.erp_code || '—'}</td>
                  <td>{leads}</td>
                </tr>
              );
            })}
            {(!partners || partners.length === 0) && (
              <tr>
                <td colSpan={6} className="empty-row">
                  Δεν βρέθηκαν συνεργάτες.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Κινητό: λίστα-κάρτες */}
      <div className="m-cards m-only">
        {(partners ?? []).map((p) => {
          const leadsN = p.lead_partners?.[0]?.count ?? 0;
          const tel = [p.mobile, p.phone].filter(Boolean)[0];
          return (
            <Link key={p.id} href={`/partners/${p.id}`} className="m-card">
              <div className="m-card-main">
                <div className="m-card-t">
                  {partnerName(p)}
                  {!p.is_active && <span className="m-attn-soft"> · ανενεργός</span>}
                </div>
                <div className="m-card-s">
                  {PARTNER_TYPE[p.type] || p.type}
                  {tel ? ` · ${tel}` : ''}
                </div>
              </div>
              <div className="m-card-side">
                <span className="m-card-cnt">{leadsN} leads</span>
                {p.erp_code && <span className="m-card-amt">ERP {p.erp_code}</span>}
              </div>
            </Link>
          );
        })}
        {(!partners || partners.length === 0) && (
          <div className="m-card-empty">Δεν βρέθηκαν συνεργάτες.</div>
        )}
      </div>
    </div>
  );
}
