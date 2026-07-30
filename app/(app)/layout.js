import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';

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
    .select('full_name, role, partner_org_id, companies(name)')
    .eq('id', user.id)
    .single();

  const isPartner = !!profile?.partner_org_id;

  const { count: initialUnread } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return (
    <div className="app-shell">
      <Sidebar
        fullName={profile?.full_name ?? user.email}
        roleLabel={ROLE_LABELS[profile?.role] ?? ''}
        userId={user.id}
        initialUnread={initialUnread ?? 0}
        isPartner={isPartner}
      />
      <main className="app-main">{children}</main>
      <BottomNav
        fullName={profile?.full_name ?? user.email}
        roleLabel={ROLE_LABELS[profile?.role] ?? ''}
        initialUnread={initialUnread ?? 0}
        isPartner={isPartner}
      />
    </div>
  );
}
