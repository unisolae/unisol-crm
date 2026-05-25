import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from './logout-button';

const ROLE_LABELS = {
  admin: 'Διαχειριστής',
  salesperson: 'Πωλητής',
  partner: 'Συνεργάτης',
};

export default async function Dashboard() {
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

  const companyName = profile?.companies?.name ?? 'Unisol';
  const roleLabel = ROLE_LABELS[profile?.role] ?? '';

  return (
    <>
      <header className="topbar">
        <div className="brand">
          Unisol<span> CRM</span>
        </div>
        <div className="topbar-right">
          <div className="who">
            <strong>{profile?.full_name ?? user.email}</strong>
            <span>
              {companyName}
              {roleLabel ? ` · ${roleLabel}` : ''}
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="page">
        <div className="page-head">
          <h1>Επισκόπηση</h1>
          <p>Καλωσήρθες στο σύστημα διαχείρισης ευκαιριών πωλήσεων.</p>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <div className="label">Ενεργά leads</div>
            <div className="value">—</div>
            <div className="hint">Φάση 3</div>
          </div>
          <div className="stat">
            <div className="label">Αξία pipeline</div>
            <div className="value">—</div>
            <div className="hint">Φάση 5</div>
          </div>
          <div className="stat">
            <div className="label">Κλεισμένες πωλήσεις</div>
            <div className="value">—</div>
            <div className="hint">Φάση 5</div>
          </div>
          <div className="stat">
            <div className="label">Εκκρεμείς ενέργειες</div>
            <div className="value">—</div>
            <div className="hint">Φάση 4</div>
          </div>
        </div>

        <div className="placeholder">
          <strong>Ο σκελετός δουλεύει.</strong>
          Είσαι συνδεδεμένος και προστατευμένος πίσω από το login. Στο επόμενο
          βήμα προσθέτουμε τη λίστα και την καρτέλα των Leads.
        </div>
      </div>
    </>
  );
}
