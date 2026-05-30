import { createClient } from '@/lib/supabase/server';
import InboxClient from './InboxClient';

export default async function InboxPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Φέρνουμε όλα τα μηνύματα της εταιρείας (Εκδοχή Β: πλήρης ορατότητα,
  // για αποφυγή διπλότυπων ειδοποιήσεων). Ο διαχωρισμός σε προβολές
  // (Εισερχόμενα / Ομάδα / Εξερχόμενα) γίνεται client-side.
  const { data: messages } = await supabase
    .from('messages')
    .select(
      'id, type, status, priority, body, due_at, created_at, completed_at, ' +
        'sender_id, recipient_user_id, recipient_group, lead_id, ' +
        'third_party_name, third_party_phone, converted_action_id, ' +
        'sender:profiles!messages_sender_id_fkey(name:full_name), ' +
        'recipient:profiles!messages_recipient_user_id_fkey(name:full_name), ' +
        'lead:leads(project_desc, city)'
    )
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(500);

  // Λίστα χρηστών (για να ξέρει ο client αν "ανήκω" σε μια ομάδα)
  const { data: me } = await supabase
    .from('profiles')
    .select('id, full_name, department, is_salesperson')
    .eq('id', user.id)
    .single();

  return (
    <div className="page">
      <div className="page-head with-action">
        <div>
          <h1>Εισερχόμενα &amp; εκκρεμότητες</h1>
          <p>Μηνύματα, callbacks και υπενθυμίσεις — ομαδοποιημένα κατά επείγον.</p>
        </div>
      </div>

      <InboxClient messages={messages ?? []} me={me ?? null} />
    </div>
  );
}
