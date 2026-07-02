'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function ActionsFilter({ salespeople, owner, status }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key, value, clearValue) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (value === clearValue) params.delete(key);
    else params.set(key, value);
    router.push(`/actions?${params.toString()}`);
  }

  return (
    <div className="filters">
      <select value={owner} onChange={(e) => update('owner', e.target.value, 'all')}>
        <option value="all">Όλοι οι πωλητές</option>
        {salespeople.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name}
          </option>
        ))}
      </select>

      <select value={status} onChange={(e) => update('status', e.target.value, 'all')}>
        <option value="all">Όλες οι καταστάσεις</option>
        <option value="planned">Προγραμματισμένες</option>
        <option value="done">Ολοκληρωμένες</option>
      </select>
    </div>
  );
}
