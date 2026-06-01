import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TopBar from '@/app/components/TopBar';

const ROLE_LABELS = {
  admin: 'Διαχειριστής',
  salesperson: 'Πωλητής',
  partner: 'Συνεργάτης',
};

export default async function AppLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, companies(name)')
    .eq('id', user.id)
    .single();

  const { count: initialUnread } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return (
    <>
      <TopBar
        fullName={profile?.full_name ?? user.email}
        companyName={profile?.companies?.name ?? 'Unisol'}
        roleLabel={ROLE_LABELS[profile?.role] ?? ''}
        initialUnread={initialUnread ?? 0}
      />
      {children}
    </>
  );
}
