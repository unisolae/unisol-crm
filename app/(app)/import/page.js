import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ImportClient from './ImportClient';

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Μόνο admin βλέπει το import
  if (profile?.role !== 'admin') {
    return (
      <div className="page narrow">
        <div className="page-head">
          <h1>Εισαγωγή από Excel</h1>
          <p>Αυτή η λειτουργία είναι διαθέσιμη μόνο σε διαχειριστές.</p>
        </div>
      </div>
    );
  }

  return <ImportClient />;
}
