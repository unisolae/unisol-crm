import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateLead } from '../actions';
import { createAction } from '@/app/(app)/actions/actions';
import LeadEditForm from './LeadEditForm';
import ActionForm from './ActionForm';

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

export default async function LeadDetail({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from('leads')
    .select('*, salespeople:profiles!leads_salesperson_id_fkey(name:full_name)')
    .eq('id', id)
    .single();

  if (!lead) notFound();

  const { data: salespeople } = await supabase
    .from('profiles')
    .select('id, name:full_name')
    .eq('is_salesperson', true)
    .order('full_name');

  // Ενέργειες αυτού του lead (χρονολόγιο)
  const { data: leadActions } = await supabase
    .from('actions')
    .select(
      'id, description, result, is_final, next_action_at, notes, acted_at, ' +
        'salesperson:profiles!actions_salesperson_id_fkey(name:full_name)'
    )
    .eq('lead_id', id)
    .order('acted_at', { ascending: false });

  const st = STATUS[lead.crm_status] ?? STATUS.unknown;
  const updateAction = updateLead.bind(null, id);
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
        <Link href="/leads">← Πίσω στα leads</Link>
      </div>

      <div className="page-head with-action">
        <div>
          <h1>{lead.project_desc || 'Lead'}</h1>
          <p>
            <span className={`badge ${st.cls}`}>{st.label}</span>
            {lead.source === 'manual' ? '  ·  Χειροκίνητη εισαγωγή' : '  ·  Από άδεια (ΥΔΟΜ)'}
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <section className="card">
          <h2>Στοιχεία {lead.source === 'manual' ? 'έργου' : 'άδειας'}</h2>
          <Row label="Περιγραφή" value={lead.project_desc} />
          <Row label="Μηχανικός" value={lead.engineer} />
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
          <LeadEditForm lead={lead} salespeople={salespeople ?? []} action={updateAction} />
        </section>
      </div>

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
              <li key={a.id} className="timeline-item">
                <span className="timeline-dot" aria-hidden="true" />
                <div className="timeline-body">
                  <div className="timeline-top">
                    <span className="timeline-when">{fmtDateTime(a.acted_at)}</span>
                    {a.salesperson?.name && (
                      <span className="timeline-who">· {a.salesperson.name}</span>
                    )}
                    {a.is_final && <span className="badge st-closed">τελική</span>}
                  </div>
                  {a.description && <div className="timeline-desc">{a.description}</div>}
                  {a.result && <div className="timeline-result">→ {a.result}</div>}
                  {a.notes && <div className="timeline-notes">{a.notes}</div>}
                  {a.next_action_at && (
                    <div className="timeline-next">
                      ⏰ επόμενη ενέργεια: {fmtDateTime(a.next_action_at)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
