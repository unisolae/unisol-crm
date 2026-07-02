import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PartnerForm from '../PartnerForm';
import ActionForm from '@/app/(app)/leads/[id]/ActionForm';
import ActionItem from '@/app/(app)/leads/[id]/ActionItem';
import {
  createPartnerAction,
  updateAction,
  deleteAction,
  completeAction,
} from '@/app/(app)/actions/actions';
import { PARTNER_TYPE, partnerName, CRM_STATUS } from '@/lib/labels';

// Προγραμματισμένες (επερχόμενες) πάνω, μετά ολοκληρωμένες (πρόσφατες πρώτα).
function actionSort(a, b) {
  const ap = a.status === 'planned';
  const bp = b.status === 'planned';
  if (ap && bp) return new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0);
  if (ap) return -1;
  if (bp) return 1;
  return new Date(b.acted_at || 0) - new Date(a.acted_at || 0);
}

export default async function PartnerDetail({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', id)
    .single();

  if (!partner) notFound();

  const { data: salespeople } = await supabase
    .from('profiles')
    .select('id, name:full_name')
    .eq('is_salesperson', true)
    .order('full_name');

  const { data: links } = await supabase
    .from('lead_partners')
    .select('lead:leads(id, project_desc, city, crm_status, lead_size_eur, sale_value_eur)')
    .eq('partner_id', id);

  const leads = (links ?? []).map((r) => r.lead).filter(Boolean);

  // Ενέργειες / επαφές αυτού του συνεργάτη (χωρίς lead)
  const { data: contactActionsRaw } = await supabase
    .from('actions')
    .select(
      'id, description, result, is_final, next_action_at, notes, acted_at, status, scheduled_at, ' +
        'salesperson:profiles!actions_salesperson_id_fkey(name:full_name)'
    )
    .eq('partner_id', id);
  const contactActions = (contactActionsRaw ?? []).slice().sort(actionSort);
  const addContactAction = createPartnerAction.bind(null, id);

  const pipeline = leads.reduce((a, l) => a + Number(l.lead_size_eur || 0), 0);
  const sales = leads.reduce((a, l) => a + Number(l.sale_value_eur || 0), 0);
  const closed = leads.filter((l) => l.crm_status === 'closed').length;
  const active = leads.filter((l) => l.crm_status === 'active').length;

  const eur = (n) =>
    n ? `${Number(n).toLocaleString('el-GR', { maximumFractionDigits: 0 })}€` : '—';

  const contact = [partner.mobile, partner.phone, partner.email].filter(Boolean).join('  ·  ');

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link href="/partners">← Πίσω στους συνεργάτες</Link>
      </div>

      <div className="page-head">
        <h1>{partnerName(partner)}</h1>
        <p>
          <span className="badge badge-neutral">{PARTNER_TYPE[partner.type] || partner.type}</span>
          {partner.erp_code ? `  ·  ERP ${partner.erp_code}` : ''}
          {contact ? `  ·  ${contact}` : ''}
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat"><div className="label">Συνδεδεμένα leads</div><div className="value">{leads.length}</div></div>
        <div className="stat"><div className="label">Ενεργά</div><div className="value">{active}</div></div>
        <div className="stat"><div className="label">Κλεισμένα</div><div className="value">{closed}</div></div>
        <div className="stat"><div className="label">Pipeline</div><div className="value">{eur(pipeline)}</div></div>
        <div className="stat"><div className="label">Πωλήσεις</div><div className="value">{eur(sales)}</div></div>
      </div>

      <div className="detail-grid">
        <section className="card">
          <h2>Στοιχεία συνεργάτη</h2>
          <PartnerForm mode="edit" partner={partner} salespeople={salespeople ?? []} />
        </section>

        <section className="card">
          <h2>Συνδεδεμένα leads</h2>
          {leads.length === 0 ? (
            <div className="dash-empty">Κανένα lead ακόμη.</div>
          ) : (
            <ul className="cal-list">
              {leads.map((l) => (
                <li key={l.id} className="cal-item">
                  <Link href={`/leads/${l.id}`} className="cal-item-link">
                    <span className="cal-item-title">{l.project_desc || 'Lead'}</span>
                    {l.city && <span className="chip">{l.city}</span>}
                    <span className="badge st-unknown">{CRM_STATUS[l.crm_status] || ''}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card actions-card">
        <div className="actions-head">
          <h2>Ενέργειες / επαφές</h2>
          <ActionForm action={addContactAction} />
        </div>
        <p className="section-hint">
          Προγραμμάτισε ή κατέγραψε επαφές με τον συνεργάτη (τηλέφωνο, επίσκεψη) — για καλλιέργεια σχέσης, χωρίς σύνδεση με lead.
        </p>

        {contactActions.length === 0 ? (
          <div className="dash-empty">Καμία ενέργεια/επαφή ακόμη.</div>
        ) : (
          <ol className="timeline">
            {contactActions.map((a) => (
              <ActionItem
                key={a.id}
                action={a}
                updateAction={updateAction}
                deleteAction={deleteAction}
                completeAction={completeAction}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
