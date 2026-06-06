import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createMessage } from '../actions';
import NewMessageForm from './NewMessageForm';

export default async function NewMessagePage() {
  const supabase = await createClient();

  // Όλοι οι χρήστες (πιθανοί παραλήπτες)
  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, is_salesperson')
    .order('full_name');

  // Πρόσφατα leads για προαιρετική σύνδεση
  const { data: leads } = await supabase
    .from('leads')
    .select('id, project_desc, city')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="page narrow">
      <div className="breadcrumb">
        <Link href="/inbox">← Πίσω στα εισερχόμενα</Link>
      </div>

      <div className="page-head">
        <h1>Νέο μήνυμα / εκκρεμότητα</h1>
        <p>Κράτα μήνυμα από τηλέφωνο, στείλε σε συνάδελφο ή όρισε υπενθύμιση.</p>
      </div>

      <NewMessageForm
        users={users ?? []}
        leads={leads ?? []}
        action={createMessage}
      />
    </div>
  );
}
