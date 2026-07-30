import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAccess } from '@/lib/access';
import { updateLead, setLeadPartnerAccess } from '../actions';
import { createAction, updateAction, deleteAction, completeAction } from '@/app/(app)/actions/actions';
import LeadEditForm from './LeadEditForm';
import ActionForm from './ActionForm';
import ActionItem from './ActionItem';
import LeadPartners from './LeadPartners';
import PartnerAccessCard from './PartnerAccessCard';
import { NEGATIVE_REASON } from '@/lib/labels';

// Ταξινόμηση χρονολογίου: προγραμματισμένες (επερχόμενες) πάνω, μετά ολοκληρωμένες (πρόσφατες πρώτα).
function actionSort(a, b) {
  const ap = a.status === 'planned';
  const bp = b.status === 'planned';
  if (ap && bp) return new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0);
  if (ap) return -1;
  if (bp) return 1;
  return new Date(b.acted_at || 0) - new Date(a.acted_at || 0);
}

const STATUS = {
  unknown: { label: 'Άγνωστη', cls: 'st-unknown' },
  active: { label: 'Ενεργή', cls: 'st-active' },
  closed: { label: 'Κλειστή', cls: 'st-closed' },
  negative: { label: 'Αρνητική', cls: 'st-negative' },
};

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

export default async function LeadDetail({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const backHref = sp?.from ? `/leads?${decodeURIComponent(sp.from)}` : '/leads';
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from('leads')
    .select('*, salespeople:profiles!leads_salesperson_id_fkey(name:full_name), partner_org:partner_orgs!leads_partner_org_id_fkey(name)')
    .eq('id', id)
    .single();

  if (!lead) notFound();

  const acc = await getAccess(supabase);

  const { data: salespeople } = await supabase
    .from('profiles')
    .select('id, name:full_name')
    .eq('is_salesperson', true)
    .order('full_name');

  // Ενέργειες αυτού του lead (χρονολόγιο)
  const { data: leadActionsRaw } = await supabase
    .from('actions')
    .select(
      'id, description, result, is_final, next_action_at, notes, acted_at, status, scheduled_at, ' +
        'salesperson:profiles!actions_salesperson_id_fkey(name:full_name)'
    )
    .eq('lead_id', id);
  const leadActions = (leadActionsRaw ?? []).slice().sort(actionSort);

  // Συνεργάτες αυτού του lead + διαθέσιμοι συνεργάτες για το picker
  const { data: partnerLinks } = await supabase
    .from('lead_partners')
    .select('partner:partners(id, full_name, company_name, type)')
    .eq('lead_id', id);
  const linkedPartners = (partnerLinks ?? []).map((r) => r.partner).filter(Boolean);

  const st = STATUS[lead.crm_status] ?? STATUS.unknown;
  const saveLead = updateLead.bind(null, id);
  const addAction = createAction.bind(null, id);

  const address = [lead.address_street, lead.address_number].filter(Boolean).join(' ');
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('el-GR') : null);
  const fmtDateTime = (d) =>
    d
      ? new Date(d).toLocaleString('el-GR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link href={backHref}>← Πίσω στα leads</Link>
      </div>

      <div className="page-head with-action">
        <div>
          <h1>{lead.project_desc || 'Lead'}</h1>
          <p>
            <span className={`badge ${st.cls}`}>{st.label}</span>
            {lead.crm_status === 'negative' && NEGATIVE_REASON[lead.negative_reason]
              ? `  ·  ${NEGATIVE_REASON[lead.negative_reason]}`
              : ''}
            {lead.source === 'manual' ? '  ·  Χειροκίνητη εισαγωγή' : '  ·  Από άδεια (ΥΔΟΜ)'}
          </p>
        </div>
      </div>

      {!acc.isPartner && lead.partner_org_id && (
        <PartnerAccessCard
          leadId={id}
          orgName={lead.partner_org?.name || 'Συνεργαζόμενη εταιρεία'}
          revoked={lead.partner_access_revoked}
          action={setLeadPartnerAccess}
        />
      )}

      <div className="detail-grid">
        <section className="card">
          <h2>Στοιχεία {lead.source === 'manual' ? 'έργου' : 'άδειας'}</h2>
          <Row label="Περιγραφή" value={lead.project_desc} />
          <Row
            label="Μηχανικός"
            value={
              lead.engineer_id && !acc.isPartner ? (
                <Link href={`/engineers/${lead.engineer_id}`}>{lead.engineer}</Link>
              ) : (
                lead.engineer
              )
            }
          />
          <Row label="Διεύθυνση" value={address} />
          <Row label="Πόλη" value={lead.city} />
          <Row label="Περιοχή" value={lead.municipality} />
          <Row label="Νομός" value={lead.prefecture} />
          <Row label="ΤΚ" value={lead.postal_code} />
          <Row label="Υπηρεσία / ΥΔΟΜ" value={lead.service_office} />
          <Row label="Τύπος πράξης" value={lead.permit_type} />
          <Row label="Ημ/νία έκδοσης" value={fmtDate(lead.permit_date)} />
          <Row label="Ισχύει έως" value={fmtDate(lead.permit_valid_until)} />
          <Row label="Α/Α αίτησης" value={lead.external_ref} />
          <Row label="Εισήχθη" value={fmtDateTime(lead.imported_at)} />
        </section>

        <section className="card">
          <h2>Διαχείριση πώλησης</h2>
          <LeadEditForm
            lead={lead}
            salespeople={salespeople ?? []}
            action={saveLead}
            isPartner={acc.isPartner}
            assignedSalesperson={lead.salespeople?.name || null}
          />
        </section>
      </div>

      <section className="card">
        <h2>Συνεργάτες έργου</h2>
        <LeadPartners leadId={id} linked={linkedPartners} />
      </section>

      <section className="card actions-card">
        <div className="actions-head">
          <h2>Χρονολόγιο ενεργειών</h2>
          <ActionForm action={addAction} />
        </div>

        {(leadActions ?? []).length === 0 ? (
          <div className="dash-empty">Καμία ενέργεια ακόμη. Πρόσθεσε την πρώτη.</div>
        ) : (
          <ol className="timeline">
            {leadActions.map((a) => (
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
