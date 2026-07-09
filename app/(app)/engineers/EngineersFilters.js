'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function EngineersFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (q) params.set('q', q);
      else params.delete('q');
      router.push(`/engineers?${params.toString()}`);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="filters">
      <input
        className="filter-search"
        type="search"
        placeholder="Αναζήτηση σε όνομα, Α.Μ. ΤΕΕ, ειδικότητα…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </div>
  );
}
