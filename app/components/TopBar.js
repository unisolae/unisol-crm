'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function TopBar({ fullName, companyName, roleLabel }) {
  const pathname = usePathname();
  const router = useRouter();

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
