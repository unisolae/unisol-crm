import { createClient } from '@/lib/supabase/server';
import InboxClient from './InboxClient';
import { markAllNotificationsRead } from './actions';

export default async function InboxPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ποια μηνύματα ήταν ΑΔΙΑΒΑΣΤΑ πριν τα μαρκάρουμε — για να ξεχωρίσουν
  // μόνο αυτή τη φορά (την πρώτη φορά που ανοίγω τη λίστα).
  const { data: unreadNotifs } = await supabase
    .from('notifications')
    .select('message_id')
    .eq('user_id', user.id)
    .eq('is_read', false);
  const unreadIds = (unreadNotifs ?? []).map((n) => n.message_id).filter(Boolean);

  // Μόλις ανοίξει το inbox, σημειώνουμε τα notifications μου ως διαβασμένα
  // (μηδενίζει το badge στο TopBar).
  await markAllNotificationsRead();

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
    .order('created_at', { ascending: false })
    .limit(500);

  // Λίστα χρηστών (για να ξέρει ο client αν "ανήκω" σε μια ομάδα)
  const { data: me } = await supabase
    .from('profiles')
    .select('id, full_name, department, is_salesperson')
    .eq('id', user.id)
    .single();

  // "Τα leads μου" — όσα έχω αναλάβει, για γρήγορη σύνδεση μηνύματος.
  // Πρώτα τα δικά μου· αν θέλει άλλα, υπάρχει αναζήτηση στον client.
  const { data: myLeads } = await supabase
    .from('leads')
    .select('id, project_desc, city')
    .eq('salesperson_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(100);

  return (
    <div className="page">
      <div className="page-head with-action">
        <div>
          <h1>Μηνύματα</h1>
          <p>Μηνύματα, callbacks και υπενθυμίσεις — ομαδοποιημένα κατά επείγον.</p>
        </div>
      </div>

      <InboxClient messages={messages ?? []} me={me ?? null} myLeads={myLeads ?? []} unreadIds={unreadIds} />
    </div>
  );
}
