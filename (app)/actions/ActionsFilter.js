'use client';

import { useRouter } from 'next/navigation';

export default function ActionsFilter({ salespeople, current }) {
  const router = useRouter();

  function onChange(e) {
    const v = e.target.value;
    router.push(v === 'all' ? '/actions' : `/actions?owner=${v}`);
  }

  return (
    <div className="filters">
      <select value={current} onChange={onChange}>
        <option value="all">Όλοι οι πωλητές</option>
        {salespeople.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}
