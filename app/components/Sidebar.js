'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Δομή πλοήγησης — ομαδοποιημένη σε ενότητες.
// "soon: true" = οθόνη που δεν έχει χτιστεί ακόμα (σήμανση «σύντομα»).
const NAV = [
  {
    section: 'Κυρίως',
    items: [
      { href: '/dashboard', label: 'Επισκόπηση', icon: 'ti-layout-dashboard' },
      { href: '/leads', label: 'Leads', icon: 'ti-target' },
      { href: '/actions', label: 'Ενέργειες', icon: 'ti-checkbox' },
      { href: '/calendar', label: 'Ημερολόγιο', icon: 'ti-calendar' },
    ],
  },
  {
    section: 'Επικοινωνία',
    items: [{ href: '/inbox', label: 'Εισερχόμενα', icon: 'ti-inbox', badge: true }],
  },
  {
    section: 'Διαχείριση',
    items: [
      { href: '/partners', label: 'Συνεργάτες', icon: 'ti-users-group', soon: true },
      { href: '/stats', label: 'Στατιστικά', icon: 'ti-chart-bar', soon: true },
      { href: '/users', label: 'Χρήστες', icon: 'ti-user-cog', soon: true },
      { href: '/import', label: 'Εισαγωγή', icon: 'ti-upload' },
    ],
  },
];

export default function Sidebar({ fullName, roleLabel, userId, initialUnread = 0 }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [mobileOpen, setMobileOpen] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/count', { cache: 'no-store' });
      if (res.ok) {
        const { count } = await res.json();
        setUnread(count ?? 0);
      }
    } catch {}
  }, []);

  // Realtime: ακούμε αλλαγές στον πίνακα notifications για ΤΟΝ χρήστη μου.
  // Όταν έρθει νέα ή αλλάξει (read), ανανεώνουμε τον μετρητή ακαριαία.
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel('notif-' + userId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => refreshCount()
      )
      .subscribe();

    // Μία ανανέωση στο mount + όταν επιστρέφει εστίαση στο παράθυρο
    refreshCount();
    const onFocus = () => refreshCount();
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [userId, refreshCount]);

  // Ανανέωση και σε κάθε αλλαγή σελίδας (π.χ. μόλις ανοίξεις το inbox → μηδενίζει)
  useEffect(() => {
    refreshCount();
    setMobileOpen(false);
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

  return (
    <>
      <button
        className="sb-burger"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Μενού"
      >
        <i className="ti ti-menu-2" aria-hidden="true" />
      </button>

      <aside className={mobileOpen ? 'sidebar sidebar-open' : 'sidebar'}>
        <div className="sb-brand">
          Unisol<span> CRM</span>
        </div>

        <nav className="sb-nav">
          {NAV.map((group) => (
            <div key={group.section} className="sb-group">
              <div className="sb-sec">{group.section}</div>
              {group.items.map((item) => {
                if (item.soon) {
                  return (
                    <span key={item.href} className="sb-link sb-soon" title="Σύντομα">
                      <i className={`ti ${item.icon}`} aria-hidden="true" />
                      {item.label}
                      <span className="sb-soon-tag">σύντομα</span>
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={isActive(item.href) ? 'sb-link on' : 'sb-link'}
                  >
                    <i className={`ti ${item.icon}`} aria-hidden="true" />
                    {item.label}
                    {item.badge && unread > 0 && (
                      <span className="sb-badge">{unread > 99 ? '99+' : unread}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sb-foot">
          <div className="sb-av">{initials}</div>
          <div className="sb-who">
            <b>{fullName}</b>
            <span>{roleLabel}</span>
          </div>
          <button className="sb-logout" onClick={handleLogout} aria-label="Αποσύνδεση" title="Αποσύνδεση">
            <i className="ti ti-logout" aria-hidden="true" />
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="sb-overlay" onClick={() => setMobileOpen(false)} />}
    </>
  );
}
