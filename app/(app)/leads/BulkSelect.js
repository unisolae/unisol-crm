'use client';

import { createContext, useContext, useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

// Επιλογή γραμμών (checkbox ανά lead) + πλωτή μπάρα μαζικών ενεργειών.
// Εμφανίζεται μόνο για εσωτερικούς χρήστες (το wrap γίνεται στο page.js).

const BulkCtx = createContext(null);

export function BulkProvider({ action, children }) {
  const [selected, setSelected] = useState(() => new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function setMany(ids, checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  }

  function clear() {
    setSelected(new Set());
  }

  function del() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const msg = `Διαγραφή ${ids.length} επιλεγμένων; Όσα έχουν ενέργειες ΔΕΝ διαγράφονται. Η ενέργεια δεν αναιρείται.`;
    if (!window.confirm(msg)) return;
    startTransition(async () => {
      const res = await action(ids);
      if (res?.error) {
        window.alert(res.error);
        return;
      }
      const deleted = res?.deleted ?? 0;
      const skipped = res?.skipped ?? 0;
      clear();
      router.refresh();
      if (skipped > 0) {
        window.alert(
          deleted > 0
            ? `Διαγράφηκαν ${deleted}. Παραλείφθηκαν ${skipped} που έχουν ενέργειες.`
            : `Δεν διαγράφηκε καμία — και οι ${skipped} έχουν ενέργειες.`
        );
      }
    });
  }

  return (
    <BulkCtx.Provider value={{ selected, toggle, setMany, clear, del, pending }}>
      {children}
      {selected.size > 0 && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 20,
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: '#003D4C',
            color: '#fff',
            borderRadius: 10,
            boxShadow: '0 6px 24px rgba(0,0,0,.3)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            font: '14px system-ui, sans-serif',
          }}
        >
          <span>
            <b>{selected.size}</b> επιλεγμένα
          </span>
          <button
            onClick={del}
            disabled={pending}
            style={{
              background: '#DB0032',
              color: '#fff',
              border: 0,
              borderRadius: 6,
              padding: '8px 12px',
              cursor: pending ? 'default' : 'pointer',
              fontWeight: 600,
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? 'Διαγραφή…' : '🗑 Διαγραφή'}
          </button>
          <button
            onClick={clear}
            disabled={pending}
            style={{ background: 'transparent', color: '#A4DBE8', border: 0, cursor: 'pointer' }}
          >
            Ακύρωση
          </button>
        </div>
      )}
    </BulkCtx.Provider>
  );
}

// Checkbox μιας γραμμής
export function RowCheck({ id }) {
  const ctx = useContext(BulkCtx);
  if (!ctx) return null;
  return (
    <input
      type="checkbox"
      checked={ctx.selected.has(id)}
      onChange={() => ctx.toggle(id)}
      onClick={(e) => e.stopPropagation()}
      aria-label="Επιλογή lead"
    />
  );
}

// Checkbox «επιλογή όλων» (της τρέχουσας σελίδας) με indeterminate state
export function HeadCheck({ ids }) {
  const ctx = useContext(BulkCtx);
  const ref = useRef(null);
  const all = ids.length > 0 && ids.every((id) => ctx?.selected.has(id));
  const some = ids.some((id) => ctx?.selected.has(id));
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some && !all;
  }, [some, all]);
  if (!ctx) return null;
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={all}
      onChange={(e) => ctx.setMany(ids, e.target.checked)}
      aria-label="Επιλογή όλων"
    />
  );
}
