'use client';

import { useRouter, useSearchParams } from 'next/navigation';

// Εναλλαγή εμβέλειας: "Τα δικά μου" (δικά μου + αδιάθετα) vs "Όλα"
export default function LeadsScope({ current }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function pick(scope) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (scope === 'all') params.set('scope', 'all');
    else params.delete('scope'); // 'mine' είναι η προεπιλογή
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <div className="lead-scope">
      <button
        className={current === 'mine' ? 'scope-btn on' : 'scope-btn'}
        onClick={() => pick('mine')}
      >
        <i className="ti ti-user" aria-hidden="true" /> Τα δικά μου
      </button>
      <button
        className={current === 'all' ? 'scope-btn on' : 'scope-btn'}
        onClick={() => pick('all')}
      >
        <i className="ti ti-users-group" aria-hidden="true" /> Όλα
      </button>
    </div>
  );
}
