import { createClient } from '@/lib/supabase/server';
import CalendarClient from './CalendarClient';
import { partnerName } from '@/lib/labels';

export default async function CalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Εκκρεμότητες/μηνύματα μου με ημερομηνία (due_at)
  const { data: messages } = await supabase
    .from('messages')
    .select('id, type, status, body, due_at, lead_id, lead:leads(project_desc)')
    .eq('recipient_user_id', user.id)
    .not('due_at', 'is', null)
    .limit(500);

  // Ενέργειές μου: ολοκληρωμένες (acted_at) + προγραμματισμένες (scheduled_at),
  // συνδεδεμένες με lead ή με συνεργάτη.
  const { data: actions } = await supabase
    .from('actions')
    .select(
      'id, description, acted_at, is_final, status, scheduled_at, lead_id, partner_id, ' +
        'lead:leads(project_desc), ' +
        'partner:partners!actions_partner_id_fkey(id, full_name, company_name)'
    )
    .eq('salesperson_id', user.id)
    .limit(800);

  const events = [];

  for (const m of messages ?? []) {
    events.push({
      id: 'm-' + m.id,
      kind: 'task',
      type: m.type,
      done: m.status === 'done' || m.status === 'cancelled',
      date: m.due_at,
      title: m.body || 'Εκκρεμότητα',
      lead: m.lead?.project_desc || null,
      href: '/inbox',
    });
  }

  for (const a of actions ?? []) {
    const planned = a.status === 'planned';
    const label = a.lead?.project_desc || (a.partner ? partnerName(a.partner) : null);
    const href = a.lead_id
      ? `/leads/${a.lead_id}`
      : a.partner_id
      ? `/partners/${a.partner_id}`
      : '/actions';

    events.push({
      id: 'a-' + a.id,
      kind: planned ? 'planned' : 'action',
      type: planned ? 'planned' : 'action',
      done: !planned,
      date: planned ? a.scheduled_at : a.acted_at,
      title: a.description || (planned ? 'Προγραμματισμένη ενέργεια' : 'Ενέργεια'),
      lead: label,
      href,
    });
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Ημερολόγιο</h1>
        <p>Οι εκκρεμότητες και οι ενέργειές σου — ολοκληρωμένες και προγραμματισμένες.</p>
      </div>
      <CalendarClient events={events} />
    </div>
  );
}
