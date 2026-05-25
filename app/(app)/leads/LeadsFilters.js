'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function LeadsFilters({ salespeople }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const status = searchParams.get('status') ?? '';
  const sp = searchParams.get('sp') ?? '';

  // debounce της αναζήτησης ώστε να μη χτυπάει σε κάθε πλήκτρο
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (q) params.set('q', q);
      else params.delete('q');
      router.push(`/leads?${params.toString()}`);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setParam(key, value) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <div className="filters">
      <input
        className="filter-search"
        type="search"
        placeholder="Αναζήτηση σε περιγραφή, διεύθυνση, μηχανικό, συνεργάτη…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select value={status} onChange={(e) => setParam('status', e.target.value)}>
        <option value="">Όλες οι καταστάσεις</option>
        <option value="unknown">Άγνωστη</option>
        <option value="active">Ενεργή</option>
        <option value="closed">Κλειστή</option>
        <option value="negative">Αρνητική</option>
      </select>
      <select value={sp} onChange={(e) => setParam('sp', e.target.value)}>
        <option value="">Όλοι οι πωλητές</option>
        {salespeople.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
