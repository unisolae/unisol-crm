'use client';

import { useRouter, useSearchParams } from 'next/navigation';

// Tabs κατάστασης — γρήγορο φίλτρο πάνω από τα αναλυτικά φίλτρα.
// "Όλα" = καθαρίζει το status param. Κάθε άλλο tab θέτει μία κατάσταση.
export default function LeadsTabs({ counts }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get('status') ?? '').split(',').filter(Boolean);

  // Ενεργό tab: αν έχει επιλεγεί ακριβώς μία κατάσταση, αυτή· αλλιώς "all"
  const active = current.length === 1 ? current[0] : 'all';

  const TABS = [
    { key: 'all', label: 'Όλα', count: counts.all },
    { key: 'active', label: 'Ενεργά', count: counts.active },
    { key: 'unknown', label: 'Αδιερεύνητα', count: counts.unknown },
    { key: 'closed', label: 'Κλειστά', count: counts.closed },
    { key: 'negative', label: 'Αρνητικά', count: counts.negative },
  ];

  function pick(key) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (key === 'all') params.delete('status');
    else params.set('status', key);
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <div className="lead-tabs">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={active === t.key ? 'lead-tab on' : 'lead-tab'}
          onClick={() => pick(t.key)}
        >
          {t.label}
          <span className="lead-tab-cnt">{t.count}</span>
        </button>
      ))}
    </div>
  );
}
