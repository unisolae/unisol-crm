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

  const [{ data: partnerOrgs }, { data: salespeople }] = await Promise.all([
    supabase.from('partner_orgs').select('id, name').eq('is_active', true).order('name'),
    supabase
      .from('profiles')
      .select('id, name:full_name')
      .eq('is_salesperson', true)
      .order('full_name'),
  ]);

  return <ImportClient partnerOrgs={partnerOrgs ?? []} salespeople={salespeople ?? []} />;
}
