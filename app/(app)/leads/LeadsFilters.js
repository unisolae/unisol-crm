'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import MultiSelect from './MultiSelect';
import { PRIORITY, LEAD_TYPE, toOptions } from '@/lib/labels';

const STATUS_OPTIONS = [
  { value: 'unknown', label: 'Άγνωστη' },
  { value: 'active', label: 'Ενεργή' },
  { value: 'closed', label: 'Κλειστή' },
  { value: 'negative', label: 'Αρνητική' },
];
const PRIORITY_OPTIONS = toOptions(PRIORITY);
const TYPE_OPTIONS = toOptions(LEAD_TYPE);

export default function LeadsFilters({ salespeople }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') ?? '');

  const statusSel = (searchParams.get('status') ?? '').split(',').filter(Boolean);
  const spSel = (searchParams.get('sp') ?? '').split(',').filter(Boolean);
  const prioSel = (searchParams.get('prio') ?? '').split(',').filter(Boolean);
  const typeSel = (searchParams.get('type') ?? '').split(',').filter(Boolean);

  // debounce της αναζήτησης
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

  function setMulti(key, values) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (values.length) params.set(key, values.join(','));
    else params.delete(key);
    router.push(`/leads?${params.toString()}`);
  }

  const spOptions = salespeople.map((s) => ({ value: s.id, label: s.name }));

  return (
    <div className="filters">
      <input
        className="filter-search"
        type="search"
        placeholder="Αναζήτηση σε περιγραφή, διεύθυνση, μηχανικό, συνεργάτη…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <MultiSelect
        label="Κατάσταση"
        options={STATUS_OPTIONS}
        selected={statusSel}
        onChange={(v) => setMulti('status', v)}
      />
      <MultiSelect
        label="Πωλητής"
        options={spOptions}
        selected={spSel}
        onChange={(v) => setMulti('sp', v)}
      />
      <MultiSelect
        label="Προτεραιότητα"
        options={PRIORITY_OPTIONS}
        selected={prioSel}
        onChange={(v) => setMulti('prio', v)}
      />
      <MultiSelect
        label="Τύπος"
        options={TYPE_OPTIONS}
        selected={typeSel}
        onChange={(v) => setMulti('type', v)}
      />
    </div>
  );
}
