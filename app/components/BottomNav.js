'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Κάτω μπάρα πλοήγησης (μόνο σε κινητό — κρύβεται στο desktop μέσω CSS).
// Κέντρο: το κόκκινο «+» για γρήγορη καταχώριση από το πεδίο.
export default function BottomNav({ fullName, roleLabel, initialUnread = 0 }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [sheet, setSheet] = useState(null); // null | 'plus' | 'menu'

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/count', { cache: 'no-store' });
      if (res.ok) {
        const { count } = await res.json();
        setUnread(count ?? 0);
      }
    } catch {}
  }, []);

  // Ελαφρύ: polling + visibility (το realtime το κρατά το Sidebar/FaviconBadge)
  useEffect(() => {
    refreshCount();
    const pollId = setInterval(refreshCount, 30000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshCount]);

  // Κλείσιμο φύλλου + ανανέωση μετρητή σε κάθε αλλαγή σελίδας
  useEffect(() => {
    setSheet(null);
    refreshCount();
  }, [pathname, refreshCount]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const isActive = (href) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const initials = (fullName || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const tabCls = (href) => 'bnav-item' + (isActive(href) ? ' on' : '');

  return (
    <>
      <nav className="bnav" aria-label="Κύρια πλοήγηση">
        <Link href="/dashboard" className={tabCls('/dashboard')}>
          <i className="ti ti-home" aria-hidden="true" />
          Αρχική
        </Link>
        <Link href="/leads" className={tabCls('/leads')}>
          <i className="ti ti-target" aria-hidden="true" />
          Leads
        </Link>
        <button
          type="button"
          className="bnav-item bnav-plus-wrap"
          onClick={() => setSheet(sheet === 'plus' ? null : 'plus')}
          aria-label="Νέα καταχώριση"
        >
          <span className="bnav-plus">
            <i className="ti ti-plus" aria-hidden="true" />
          </span>
        </button>
        <Link href="/inbox" className={tabCls('/inbox')} style={{ position: 'relative' }}>
          <i className="ti ti-inbox" aria-hidden="true" />
          Μηνύματα
          {unread > 0 && <span className="bnav-badge">{unread > 99 ? '99+' : unread}</span>}
        </Link>
        <button
          type="button"
          className={'bnav-item' + (sheet === 'menu' ? ' on' : '')}
          onClick={() => setSheet(sheet === 'menu' ? null : 'menu')}
        >
          <i className="ti ti-menu-2" aria-hidden="true" />
          Μενού
        </button>
      </nav>

      {sheet && (
        <div className="bsheet-bg" onClick={() => setSheet(null)}>
          <div className="bsheet" onClick={(e) => e.stopPropagation()}>
            {sheet === 'plus' ? (
              <>
                <div className="bsheet-title">Νέα καταχώριση</div>
                <Link href="/leads/new" className="bsheet-row">
                  <i className="ti ti-target" aria-hidden="true" />
                  Νέο lead
                </Link>
                <Link href="/actions/new" className="bsheet-row">
                  <i className="ti ti-checkbox" aria-hidden="true" />
                  Νέα ενέργεια
                </Link>
                <Link href="/inbox/new" className="bsheet-row">
                  <i className="ti ti-mail" aria-hidden="true" />
                  Νέο μήνυμα
                </Link>
                <Link href="/partners/new" className="bsheet-row">
                  <i className="ti ti-users" aria-hidden="true" />
                  Νέος συνεργάτης
                </Link>
              </>
            ) : (
              <>
                <div className="bsheet-user">
                  <span className="bsheet-av">{initials}</span>
                  <span>
                    <b>{fullName}</b>
                    <small>{roleLabel}</small>
                  </span>
                </div>
                <Link href="/actions" className="bsheet-row">
                  <i className="ti ti-checkbox" aria-hidden="true" />
                  Ενέργειες &amp; επαφές
                </Link>
                <Link href="/calendar" className="bsheet-row">
                  <i className="ti ti-calendar" aria-hidden="true" />
                  Ημερολόγιο
                </Link>
                <Link href="/partners" className="bsheet-row">
                  <i className="ti ti-users" aria-hidden="true" />
                  Συνεργάτες
                </Link>
                <Link href="/engineers" className="bsheet-row">
                  <i className="ti ti-helmet" aria-hidden="true" />
                  Μηχανικοί
                </Link>
                <Link href="/import" className="bsheet-row">
                  <i className="ti ti-upload" aria-hidden="true" />
                  Εισαγωγή leads
                </Link>
                <Link href="/partners/import" className="bsheet-row">
                  <i className="ti ti-file-upload" aria-hidden="true" />
                  Εισαγωγή επαφών
                </Link>
                <span className="bsheet-row soon">
                  <i className="ti ti-chart-bar" aria-hidden="true" />
                  Στατιστικά
                  <em>σύντομα</em>
                </span>
                <button type="button" className="bsheet-row danger" onClick={handleLogout}>
                  <i className="ti ti-logout" aria-hidden="true" />
                  Αποσύνδεση
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
