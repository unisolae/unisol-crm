import { createClient } from '@/lib/supabase/server';
import CalendarClient from './CalendarClient';

export default async function CalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Εκκρεμότητες/μηνύματα μου με ημερομηνία (due_at)
  const { data: messages } = await supabase
    .from('messages')
    .select(
      'id, type, status, body, due_at, lead_id, ' +
        'lead:leads(project_desc)'
    )
    .eq('recipient_user_id', user.id)
    .not('due_at', 'is', null)
    .limit(500);

  // Ενέργειές μου (ιστορικό — με acted_at). Δείχνουμε όσες ΔΕΝ έχουν
  // δικό τους reminder (αποφυγή διπλοεγγραφής): δηλαδή χωρίς next_action_at,
  // ή τελικές. Τις προγραμματισμένες τις καλύπτει το reminder στα messages.
  const { data: actions } = await supabase
    .from('actions')
    .select(
      'id, description, acted_at, is_final, next_action_at, lead_id, ' +
        'lead:leads(project_desc)'
    )
    .eq('salesperson_id', user.id)
    .limit(500);

  // Μετατροπή σε ενιαία "events" με κοινό σχήμα
  const events = [];

  for (const m of messages ?? []) {
    events.push({
      id: 'm-' + m.id,
      kind: 'task', // εκκρεμότητα
      type: m.type,
      done: m.status === 'done' || m.status === 'cancelled',
      date: m.due_at,
      title: m.body || 'Εκκρεμότητα',
      lead: m.lead?.project_desc || null,
      lead_id: m.lead_id,
      href: '/inbox',
    });
  }

  for (const a of actions ?? []) {
    // Δείχνουμε την ίδια την ενέργεια στην ημερομηνία που έγινε (acted_at)
    events.push({
      id: 'a-' + a.id,
      kind: 'action', // ενέργεια (ιστορικό)
      type: 'action',
      done: true,
      date: a.acted_at,
      title: a.description || 'Ενέργεια',
      lead: a.lead?.project_desc || null,
      lead_id: a.lead_id,
      href: a.lead_id ? `/leads/${a.lead_id}` : '/actions',
    });
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Ημερολόγιο</h1>
        <p>Οι εκκρεμότητες και οι ενέργειές σου, σε μηνιαία επισκόπηση.</p>
      </div>
      <CalendarClient events={events} />
    </div>
  );
}
