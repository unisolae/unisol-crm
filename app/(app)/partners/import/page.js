import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PartnersImportClient from './PartnersImportClient';

export default async function PartnersImportPage() {
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

  if (profile?.role !== 'admin') {
    return (
      <div className="page narrow">
        <div className="page-head">
          <h1>Εισαγωγή επαφών από Excel</h1>
          <p>Αυτή η λειτουργία είναι διαθέσιμη μόνο σε διαχειριστές.</p>
        </div>
      </div>
    );
  }

  return <PartnersImportClient />;
}
