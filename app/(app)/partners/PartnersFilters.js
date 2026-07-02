'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import MultiSelect from '@/app/(app)/leads/MultiSelect';
import { PARTNER_TYPE, toOptions } from '@/lib/labels';

const TYPE_OPTIONS = toOptions(PARTNER_TYPE);

export default function PartnersFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const typeSel = (searchParams.get('type') ?? '').split(',').filter(Boolean);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (q) params.set('q', q);
      else params.delete('q');
      router.push(`/partners?${params.toString()}`);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setMulti(key, values) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (values.length) params.set(key, values.join(','));
    else params.delete(key);
    router.push(`/partners?${params.toString()}`);
  }

  return (
    <div className="filters">
      <input
        className="filter-search"
        type="search"
        placeholder="Αναζήτηση σε όνομα, τηλέφωνο, ERP…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
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
