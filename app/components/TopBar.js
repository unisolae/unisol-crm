'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function TopBar({ fullName, companyName, roleLabel, initialUnread = 0 }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/count', { cache: 'no-store' });
      if (res.ok) {
        const { count } = await res.json();
        setUnread(count ?? 0);
      }
    } catch {
      // σιωπηλά — δεν θέλουμε να σπάει το TopBar αν πέσει το δίκτυο
    }
  }, []);

  // Polling κάθε 45 δευτ. + μία φορά σε κάθε αλλαγή σελίδας
  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, 45000);
    return () => clearInterval(id);
  }, [refreshCount, pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const isActive = (href) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand">
          Unisol<span> CRM</span>
        </div>
        <nav className="nav">
          <Link className={isActive('/dashboard') ? 'nav-link active' : 'nav-link'} href="/dashboard">
            Επισκόπηση
          </Link>
          <Link className={isActive('/leads') ? 'nav-link active' : 'nav-link'} href="/leads">
            Leads
          </Link>
          <Link className={isActive('/actions') ? 'nav-link active' : 'nav-link'} href="/actions">
            Ενέργειες
          </Link>
          <Link
            className={isActive('/inbox') ? 'nav-link active nav-inbox' : 'nav-link nav-inbox'}
            href="/inbox"
          >
            Εισερχόμενα
            {unread > 0 && <span className="nav-badge">{unread > 99 ? '99+' : unread}</span>}
          </Link>
          <Link className={isActive('/import') ? 'nav-link active' : 'nav-link'} href="/import">
            Εισαγωγή
          </Link>
        </nav>
      </div>
      <div className="topbar-right">
        <div className="who">
          <strong>{fullName}</strong>
          <span>
            {companyName}
            {roleLabel ? ` · ${roleLabel}` : ''}
          </span>
        </div>
        <button className="btn-ghost" onClick={handleLogout}>
          Αποσύνδεση
        </button>
      </div>
    </header>
  );
}
